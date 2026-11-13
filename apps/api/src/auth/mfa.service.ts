import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  private readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

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
   * Compute standard RFC 6238 TOTP 6-digit code for a given timestamp
   */
  computeTotp(secret: string, timestampMs = Date.now(), stepSeconds = 30): string {
    const counter = Math.floor(timestampMs / 1000 / stepSeconds);
    const key = this.decodeBase32(secret);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter), 0);

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
   * Verify TOTP code with time drift window (-1, 0, +1 step = 90s total window)
   * Includes replay protection: rejects if current code matches lastUsedCode
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

    // Replay attack prevention: if same code was already used in recent window
    if (lastUsedCode && lastUsedCode === cleanCode) {
      return { valid: false };
    }

    const now = Date.now();
    for (const drift of [0, -1, 1]) {
      const stepMs = now + drift * stepSeconds * 1000;
      const expected = this.computeTotp(secret, stepMs, stepSeconds);
      if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
        return { valid: true, usedCode: cleanCode };
      }
    }

    return { valid: false };
  }

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
   * Hash a recovery code using SHA-256
   */
  hashRecoveryCode(code: string): string {
    const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Verify and consume a recovery code from the stored hashed list
   */
  verifyAndConsumeRecoveryCode(
    code: string,
    storedHashedCodes: string[],
  ): { valid: boolean; remainingHashedCodes: string[] } {
    const incomingHash = this.hashRecoveryCode(code);
    const index = storedHashedCodes.findIndex((storedHash) => storedHash === incomingHash);

    if (index === -1) {
      return { valid: false, remainingHashedCodes: storedHashedCodes };
    }

    const remaining = [...storedHashedCodes];
    remaining.splice(index, 1);
    return { valid: true, remainingHashedCodes: remaining };
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
