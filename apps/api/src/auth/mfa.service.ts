import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private readonly CURRENT_KEY_VERSION = 'v1';

  /**
   * Derive or obtain the 256-bit encryption key for the given version.
   * Encryption keys are kept strictly outside the database.
   */
  private getEncryptionKey(version = 'v1'): Buffer {
    if (version !== 'v1') {
      throw new Error(`Unsupported MFA encryption key version: ${version}`);
    }

    const envKey = process.env.MFA_ENCRYPTION_KEY;
    if (envKey && envKey.trim().length >= 32) {
      if (/^[0-9a-fA-F]{64}$/.test(envKey.trim())) {
        return Buffer.from(envKey.trim(), 'hex');
      }
      return crypto.createHash('sha256').update(envKey.trim()).digest();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'MFA cryptographic failure: Neither MFA_ENCRYPTION_KEY nor valid JWT_SECRET configured.',
      );
    }

    // High-entropy HKDF key derivation with dedicated salt and context info
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        secret,
        'aeo-nexus-mfa-pepper-salt-v1',
        'mfa-totp-encryption-v1',
        32,
      ),
    );
  }

  /**
   * Derive or obtain the keyed pepper for recovery code hashing.
   */
  private getRecoveryPepper(): Buffer {
    const envPepper = process.env.MFA_RECOVERY_PEPPER;
    if (envPepper && envPepper.trim().length >= 32) {
      return crypto.createHash('sha256').update(envPepper.trim()).digest();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'MFA recovery pepper failure: Neither MFA_RECOVERY_PEPPER nor valid JWT_SECRET configured.',
      );
    }

    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        secret,
        'aeo-nexus-recovery-salt-v1',
        'mfa-recovery-keyed-pepper-v1',
        32,
      ),
    );
  }

  // ===========================================================================
  // 1. Authenticated Encryption at Rest (AES-256-GCM)
  // ===========================================================================

  /**
   * Encrypt a plaintext Base32 TOTP secret using AES-256-GCM.
   * Generates a unique 96-bit random IV/nonce for each encryption.
   * Returns format: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
   */
  encryptSecret(plaintextBase32Secret: string): string {
    if (!plaintextBase32Secret || plaintextBase32Secret.trim().length === 0) {
      throw new BadRequestException('Cannot encrypt empty MFA secret');
    }

    const key = this.getEncryptionKey(this.CURRENT_KEY_VERSION);
    const iv = crypto.randomBytes(12); // 96-bit nonce
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintextBase32Secret.trim(), 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${this.CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag}:${ciphertext}`;
  }

  /**
   * Decrypt an encrypted TOTP secret using AES-256-GCM with authentication tag validation.
   * Fails safely without silent fallback if ciphertext or auth tag is corrupted/tampered.
   * Supports seamless backward compatibility if existing stored secret is legacy raw Base32.
   */
  decryptSecret(storedSecret: string): string {
    if (!storedSecret) {
      throw new BadRequestException('MFA secret is missing');
    }

    const trimmed = storedSecret.trim();

    // Check version prefix
    if (!trimmed.startsWith('v1:')) {
      // Legacy unencrypted Base32 detection (safe backward compatibility during migration)
      if (/^[A-Z2-7=]+$/i.test(trimmed)) {
        return trimmed.toUpperCase();
      }
      throw new UnauthorizedException('Unrecognized or invalid MFA secret payload format');
    }

    const parts = trimmed.split(':');
    if (parts.length !== 4) {
      throw new UnauthorizedException('Malformed encrypted MFA secret structure');
    }

    const [version, ivHex, tagHex, cipherHex] = parts;
    const key = this.getEncryptionKey(version);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      throw new UnauthorizedException(
        'MFA secret decryption failed: Invalid authentication tag or corrupted ciphertext.',
      );
    }
  }

  // ===========================================================================
  // 2. Base32 & RFC 6238 TOTP Engine
  // ===========================================================================

  /**
   * Generate a random base32 TOTP secret (160 bits / 20 bytes -> 32 base32 characters)
   */
  generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.encodeBase32(buffer);
  }

  /**
   * Base32 encoding (RFC 4648)
   */
  private encodeBase32(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        output += this.BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += this.BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Base32 decoding (RFC 4648)
   */
  private decodeBase32(str: string): Buffer {
    const cleaned = str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = this.BASE32_ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) {
        throw new BadRequestException('Invalid base32 secret character');
      }

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Calculate RFC 6238 counter for a timestamp
   */
  calculateCounter(timestampMs = Date.now(), stepSeconds = 30): bigint {
    return BigInt(Math.floor(timestampMs / 1000 / stepSeconds));
  }

  /**
   * Compute standard RFC 6238 TOTP 6-digit code for a specific counter step
   */
  computeTotpForStep(secret: string, step: bigint): string {
    const key = this.decodeBase32(secret);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(step, 0);

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const code = (binary % 1_000_000).toString().padStart(6, '0');
    return code;
  }

  /**
   * Compute standard RFC 6238 TOTP 6-digit code for a timestamp
   */
  computeTotp(secret: string, timestampMs = Date.now(), stepSeconds = 30): string {
    const step = this.calculateCounter(timestampMs, stepSeconds);
    return this.computeTotpForStep(secret, step);
  }

  // ===========================================================================
  // 3. Time-Step Counter Replay Protection & Drift Tolerance
  // ===========================================================================

  /**
   * Verify TOTP code with time drift window (-1, 0, +1 step = 90s total window)
   * Enforces time-step counter replay prevention:
   * Rejects any counter step that is less than or equal to lastAcceptedStep.
   */
  verifyTotpCounter(
    secret: string,
    code: string,
    lastAcceptedStep?: bigint | number | null,
    timestampMs = Date.now(),
    stepSeconds = 30,
  ): { valid: boolean; acceptedStep?: bigint; code?: string } {
    const cleanCode = code.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      return { valid: false };
    }

    const lastStep =
      lastAcceptedStep !== null && lastAcceptedStep !== undefined
        ? BigInt(lastAcceptedStep)
        : null;

    const currentCounter = this.calculateCounter(timestampMs, stepSeconds);

    // Tolerance window: [current, past (-1), future (+1)]
    const candidateDrifts = [0, -1, 1];

    for (const drift of candidateDrifts) {
      const step = currentCounter + BigInt(drift);

      // Counter Replay Prevention: rejected if already consumed or older than last accepted counter
      if (lastStep !== null && step <= lastStep) {
        continue;
      }

      const expected = this.computeTotpForStep(secret, step);
      if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
        return { valid: true, acceptedStep: step, code: cleanCode };
      }
    }

    return { valid: false };
  }

  /**
   * Legacy verifyTotp wrapper maintaining backward compatibility with Phase 7A callers
   */
  verifyTotp(
    secret: string,
    code: string,
    lastUsedCode?: string | null,
    stepSeconds = 30,
  ): { valid: boolean; usedCode?: string } {
    const cleanCode = code.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      return { valid: false };
    }

    if (lastUsedCode && lastUsedCode === cleanCode) {
      return { valid: false };
    }

    const res = this.verifyTotpCounter(secret, cleanCode, null, Date.now(), stepSeconds);
    return { valid: res.valid, usedCode: res.code };
  }

  // ===========================================================================
  // 4. Hardened Recovery Codes (Keyed HMAC-SHA256 with Pepper)
  // ===========================================================================

  /**
   * Generate 10 single-use recovery backup codes
   */
  generateRecoveryCodes(count = 10): { plaintextCodes: string[]; hashedCodes: string[] } {
    const plaintextCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
      const code = `${part1}-${part2}`;
      plaintextCodes.push(code);
      hashedCodes.push(this.hashRecoveryCode(code));
    }

    return { plaintextCodes, hashedCodes };
  }

  /**
   * Hash a recovery code using keyed HMAC-SHA256 with server-side pepper
   */
  hashRecoveryCode(code: string): string {
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const pepper = this.getRecoveryPepper();
    return crypto.createHmac('sha256', pepper).update(normalized).digest('hex');
  }

  /**
   * Legacy raw SHA-256 hash for backward compatibility during account migration
   */
  hashRecoveryCodeLegacy(code: string): string {
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Verify and find index of a recovery code in stored hashes.
   * Checks both keyed HMAC-SHA256 and legacy SHA-256 for backward compatibility.
   */
  verifyAndConsumeRecoveryCode(
    code: string,
    storedHashedCodes: string[],
  ): { valid: boolean; matchedHash?: string; remainingHashedCodes: string[] } {
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length < 6) {
      return { valid: false, remainingHashedCodes: storedHashedCodes };
    }

    const keyedHash = this.hashRecoveryCode(normalized);
    let index = storedHashedCodes.findIndex((storedHash) => {
      if (storedHash.length === keyedHash.length) {
        return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(keyedHash));
      }
      return false;
    });

    let matchedHash = keyedHash;

    // Backward compatibility with legacy SHA-256 hashes
    if (index === -1) {
      const legacyHash = this.hashRecoveryCodeLegacy(normalized);
      index = storedHashedCodes.findIndex((storedHash) => {
        if (storedHash.length === legacyHash.length) {
          return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(legacyHash));
        }
        return false;
      });
      if (index !== -1) {
        matchedHash = storedHashedCodes[index];
      }
    }

    if (index === -1) {
      return { valid: false, remainingHashedCodes: storedHashedCodes };
    }

    const remaining = [...storedHashedCodes];
    remaining.splice(index, 1);
    return { valid: true, matchedHash, remainingHashedCodes: remaining };
  }

  /**
   * Generate otpauth URI for authenticator apps (Google Authenticator, Authy, etc.)
   */
  getOtpAuthUri(secret: string, email: string, issuer = 'AEO Nexus'): string {
    const cleanEmail = encodeURIComponent(email);
    const cleanIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
  }
}
