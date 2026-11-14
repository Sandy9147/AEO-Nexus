import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MfaService implements OnModuleInit {
  private readonly logger = new Logger(MfaService.name);
  private readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  onModuleInit() {
    this.validateProductionKeys();
  }

  /**
   * Validate production keys on startup or readiness verification.
   * In production (NODE_ENV === 'production'), strict independent keys are mandatory.
   * Throws an Error if required keys are missing or invalid, halting startup safely.
   */
  validateProductionKeys(): void {
    const isProd = process.env.NODE_ENV === 'production';

    // 1. Encryption Key Validation
    const encKey = process.env.MFA_ENCRYPTION_KEY;
    if (isProd) {
      if (!encKey || encKey.trim().length === 0 || encKey === 'undefined') {
        throw new Error(
          'FATAL CONFIGURATION ERROR: MFA_ENCRYPTION_KEY is required in production. ' +
          'Must be a 64-character hexadecimal or 44-character base64 string (32 bytes).',
        );
      }
      this.parseAndValidateKey(encKey, 'MFA_ENCRYPTION_KEY');
    } else if (encKey && encKey.trim().length > 0 && encKey !== 'undefined') {
      this.parseAndValidateKey(encKey, 'MFA_ENCRYPTION_KEY');
    } else {
      this.logger.warn(
        '[SECURITY NOTICE] MFA_ENCRYPTION_KEY not set. Falling back to development HKDF key derivation. ' +
        'DO NOT RUN IN PRODUCTION WITHOUT AN EXPLICIT MFA_ENCRYPTION_KEY.',
      );
    }

    // 2. Recovery Pepper Validation
    const recoveryPepper = process.env.MFA_RECOVERY_PEPPER;
    if (isProd) {
      if (!recoveryPepper || recoveryPepper.trim().length < 32 || recoveryPepper === 'undefined') {
        throw new Error(
          'FATAL CONFIGURATION ERROR: MFA_RECOVERY_PEPPER is required in production and must be at least 32 characters.',
        );
      }
    } else if (!recoveryPepper || recoveryPepper === 'undefined') {
      this.logger.warn(
        '[SECURITY NOTICE] MFA_RECOVERY_PEPPER not set. Falling back to development HKDF pepper derivation. ' +
        'DO NOT RUN IN PRODUCTION WITHOUT AN EXPLICIT MFA_RECOVERY_PEPPER.',
      );
    }
  }

  /**
   * Strictly parse and validate a 32-byte (256-bit) encryption key from hex or base64.
   */
  parseAndValidateKey(keyString: string, keyName = 'MFA_ENCRYPTION_KEY'): Buffer {
    if (!keyString || typeof keyString !== 'string') {
      throw new Error(`Invalid ${keyName}: Key value must be a non-empty string.`);
    }

    const trimmed = keyString.trim();

    // 64-char hexadecimal (32 bytes)
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }

    // 44-char base64 (32 bytes)
    if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed) || /^[A-Za-z0-9+/]{42}==$/.test(trimmed)) {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length === 32) return buf;
    }

    throw new Error(
      `Invalid ${keyName} format: Key must be exactly 32 bytes (64 hexadecimal characters or 44 base64 characters).`,
    );
  }

  /**
   * Active key version to use for new encryptions (default: 'v1').
   */
  getActiveKeyVersion(): string {
    return (process.env.MFA_KEY_VERSION || 'v1').trim().toLowerCase();
  }

  /**
   * Obtain the 256-bit encryption key for the given version.
   * Supports multi-version key rotation:
   * e.g. v1 -> MFA_ENCRYPTION_KEY_V1 (or MFA_ENCRYPTION_KEY fallback)
   *      v2 -> MFA_ENCRYPTION_KEY_V2 (or MFA_ENCRYPTION_KEY if active is v2)
   */
  getEncryptionKey(version = 'v1'): Buffer {
    const normalizedVersion = version.toLowerCase();

    // 1. Version-specific environment key: MFA_ENCRYPTION_KEY_V1, MFA_ENCRYPTION_KEY_V2
    const versionKey = process.env[`MFA_ENCRYPTION_KEY_${normalizedVersion.toUpperCase()}`];
    if (versionKey && versionKey.trim().length > 0) {
      return this.parseAndValidateKey(
        versionKey,
        `MFA_ENCRYPTION_KEY_${normalizedVersion.toUpperCase()}`,
      );
    }

    // 2. Default MFA_ENCRYPTION_KEY if version matches active version or is v1 default
    const defaultKey = process.env.MFA_ENCRYPTION_KEY;
    if (defaultKey && defaultKey.trim().length > 0 && defaultKey !== 'undefined') {
      const activeVersion = this.getActiveKeyVersion();
      if (normalizedVersion === activeVersion || normalizedVersion === 'v1') {
        return this.parseAndValidateKey(defaultKey, 'MFA_ENCRYPTION_KEY');
      }
    }

    // In production, failure to configure key throws immediately
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Production MFA failure: No encryption key configured for version "${normalizedVersion}".`,
      );
    }

    // Development-only fallback via HKDF from JWT_SECRET
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'MFA cryptographic failure: Neither MFA_ENCRYPTION_KEY nor valid JWT_SECRET configured.',
      );
    }

    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        secret,
        `aeo-nexus-mfa-pepper-salt-${normalizedVersion}`,
        `mfa-totp-encryption-${normalizedVersion}`,
        32,
      ),
    );
  }

  /**
   * Derive or obtain the keyed pepper for recovery code hashing.
   */
  getRecoveryPepper(): Buffer {
    const envPepper = process.env.MFA_RECOVERY_PEPPER;
    if (envPepper && envPepper.trim().length >= 32 && envPepper !== 'undefined') {
      if (/^[0-9a-fA-F]{64}$/.test(envPepper.trim())) {
        return Buffer.from(envPepper.trim(), 'hex');
      }
      return crypto.createHash('sha256').update(envPepper.trim()).digest();
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Production MFA failure: MFA_RECOVERY_PEPPER is missing or less than 32 characters in production.',
      );
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
   * Returns format: <version>:<iv_hex>:<authTag_hex>:<ciphertext_hex>
   */
  encryptSecret(plaintextBase32Secret: string, targetVersion?: string): string {
    if (!plaintextBase32Secret || plaintextBase32Secret.trim().length === 0) {
      throw new BadRequestException('Cannot encrypt empty MFA secret');
    }

    const version = (targetVersion || this.getActiveKeyVersion()).toLowerCase();
    const key = this.getEncryptionKey(version);
    const iv = crypto.randomBytes(12); // 96-bit nonce
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let ciphertext = cipher.update(plaintextBase32Secret.trim(), 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${version}:${iv.toString('hex')}:${authTag}:${ciphertext}`;
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

    // Check version prefix (e.g. v1, v2)
    const versionMatch = trimmed.match(/^(v\d+):([0-9a-fA-F]{24}):([0-9a-fA-F]{32}):([0-9a-fA-F]+)$/);
    if (!versionMatch) {
      // Legacy unencrypted Base32 detection (safe backward compatibility during migration)
      if (/^[A-Z2-7=]+$/i.test(trimmed)) {
        return trimmed.toUpperCase();
      }
      throw new UnauthorizedException('Unrecognized or invalid MFA secret payload format');
    }

    const [, version, ivHex, tagHex, cipherHex] = versionMatch;
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
   * Returns isLegacy flag to identify accounts using legacy SHA-256 codes.
   */
  verifyAndConsumeRecoveryCode(
    code: string,
    storedHashedCodes: string[],
  ): { valid: boolean; matchedHash?: string; remainingHashedCodes: string[]; isLegacy?: boolean } {
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
    let isLegacy = false;

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
        isLegacy = true;
      }
    }

    if (index === -1) {
      return { valid: false, remainingHashedCodes: storedHashedCodes };
    }

    const remaining = [...storedHashedCodes];
    remaining.splice(index, 1);
    return { valid: true, matchedHash, remainingHashedCodes: remaining, isLegacy };
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
