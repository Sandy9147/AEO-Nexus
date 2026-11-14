/**
 * AEO Nexus — Phase 7A.2 MFA Operational Security & Key Rotation Suite
 * Independent Production Keys, Key Rotation, Challenge Persisted Lifecycle & Recovery Migration
 */

import * as fs from 'fs';
import * as path from 'path';

function loadEnv(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            let val = trimmed.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

loadEnv(path.resolve(__dirname, '../../.env'));
loadEnv(path.resolve(__dirname, '../.env'));

import { PrismaClient, PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from '../src/auth/auth.service';
import { MfaService } from '../src/auth/mfa.service';
import { EmailService } from '../src/email/email.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { signJwtHmacSha256 } from '@aeo-nexus/auth';

interface TestResult {
  scenario: number;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function recordScenario(
  scenario: number,
  name: string,
  fn: () => Promise<{ details?: string } | void>,
) {
  try {
    const res = await fn();
    results.push({
      scenario,
      name,
      passed: true,
      details: res && typeof res === 'object' && 'details' in res ? (res as any).details : undefined,
    });
    console.log(`  [PASS] Scenario ${scenario}: ${name}`);
  } catch (err: any) {
    results.push({
      scenario,
      name,
      passed: false,
      error: err.message || String(err),
    });
    console.error(`  [FAIL] Scenario ${scenario}: ${name} -> ${err.message}`);
  }
}

async function runPhase7a2OperationalSuite() {
  console.log('\n===============================================================');
  console.log('   AEO Nexus — Phase 7A.2 MFA Operational Security Suite');
  console.log('   Key Independence, Rotation, Challenge Lifecycle & Migration');
  console.log('===============================================================\n');

  let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  if (!dbUrl.includes('connection_limit=')) {
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${sep}connection_limit=5&pool_timeout=30`;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  // Resilient connect with retries for Neon serverless wake-up
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await prisma.$connect();
      break;
    } catch (e: any) {
      if (attempt === 6) throw e;
      console.log(`  Database connection attempt ${attempt} connecting (waking up compute)... retrying in 3s`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const prismaService = prisma as unknown as PrismaService;
  const emailService = new EmailService();
  const mfaService = new MfaService();
  const authService = new AuthService(prismaService, emailService, mfaService);

  const testRunId = `p7a2_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEncKey = process.env.MFA_ENCRYPTION_KEY;
  const originalPepper = process.env.MFA_RECOVERY_PEPPER;
  const originalJwtSecret = process.env.JWT_SECRET;

  function restoreEnv(key: string, val: string | undefined) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }

  let testAdminUser: any = null;
  let testRegularUser: any = null;
  const adminPassword = 'AdminPassword7A2!@#';
  const regularPassword = 'UserPassword7A2!@#';

  try {
    // -------------------------------------------------------------------------
    // 1. Missing Production Encryption Key Enforcement
    // -------------------------------------------------------------------------
    await recordScenario(1, 'Missing MFA_ENCRYPTION_KEY in production halts startup with fatal error', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.MFA_ENCRYPTION_KEY;

      let caught = false;
      try {
        mfaService.validateProductionKeys();
      } catch (err: any) {
        if (err.message.includes('MFA_ENCRYPTION_KEY is required in production')) {
          caught = true;
        }
      } finally {
        restoreEnv('NODE_ENV', originalNodeEnv);
        restoreEnv('MFA_ENCRYPTION_KEY', originalEncKey);
      }

      if (!caught) throw new Error('validateProductionKeys did not throw error when MFA_ENCRYPTION_KEY missing in production');
      return { details: 'Fatal configuration exception thrown safely when MFA_ENCRYPTION_KEY missing in production' };
    });

    // -------------------------------------------------------------------------
    // 2. Missing Production Recovery Pepper Enforcement
    // -------------------------------------------------------------------------
    await recordScenario(2, 'Missing MFA_RECOVERY_PEPPER in production halts startup with fatal error', async () => {
      process.env.NODE_ENV = 'production';
      process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      delete process.env.MFA_RECOVERY_PEPPER;

      let caught = false;
      try {
        mfaService.validateProductionKeys();
      } catch (err: any) {
        if (err.message.includes('MFA_RECOVERY_PEPPER is required in production')) {
          caught = true;
        }
      } finally {
        restoreEnv('NODE_ENV', originalNodeEnv);
        restoreEnv('MFA_ENCRYPTION_KEY', originalEncKey);
        restoreEnv('MFA_RECOVERY_PEPPER', originalPepper);
      }

      if (!caught) throw new Error('validateProductionKeys did not throw error when MFA_RECOVERY_PEPPER missing in production');
      return { details: 'Fatal configuration exception thrown safely when MFA_RECOVERY_PEPPER missing in production' };
    });

    // -------------------------------------------------------------------------
    // 3. Strict Key Length and Encoding Validation
    // -------------------------------------------------------------------------
    await recordScenario(3, 'Invalid key format (invalid hex, short length, non-base64) strictly rejected', async () => {
      const invalidKeys = [
        'short_key_16_bytes!',
        '1234567890abcdef', // only 16 hex chars
        'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', // 64 chars, but non-hex 'z'
        '!!!invalid_base64_string_not_32_bytes_long!!!',
      ];

      for (const badKey of invalidKeys) {
        let threw = false;
        try {
          mfaService.parseAndValidateKey(badKey, 'TEST_KEY');
        } catch {
          threw = true;
        }
        if (!threw) throw new Error(`Invalid key "${badKey}" was accepted without validation error`);
      }

      // Valid 64-char hex key
      const validHexKey = crypto.randomBytes(32).toString('hex');
      const hexBuf = mfaService.parseAndValidateKey(validHexKey, 'VALID_HEX');
      if (hexBuf.length !== 32) throw new Error('Valid hex key did not parse to 32 bytes');

      // Valid 44-char base64 key
      const validBase64Key = crypto.randomBytes(32).toString('base64');
      const b64Buf = mfaService.parseAndValidateKey(validBase64Key, 'VALID_B64');
      if (b64Buf.length !== 32) throw new Error('Valid base64 key did not parse to 32 bytes');

      return { details: 'Hex and base64 formats strictly validated to exact 32-byte buffers' };
    });

    // -------------------------------------------------------------------------
    // 4. JWT Secret Rotation Independence
    // -------------------------------------------------------------------------
    await recordScenario(4, 'JWT secret rotation does not impair MFA secret decryption (key independence)', async () => {
      const dedicatedMfaKey = crypto.randomBytes(32).toString('hex');
      process.env.MFA_ENCRYPTION_KEY = dedicatedMfaKey;
      process.env.JWT_SECRET = 'initial-jwt-signing-secret-for-aeo-nexus-platform-32b';

      const plainSecret = mfaService.generateSecret();
      const encryptedSecret = mfaService.encryptSecret(plainSecret);

      // Now rotate JWT_SECRET to a completely different secret
      process.env.JWT_SECRET = 'newly-rotated-jwt-signing-secret-production-2026-32b';

      // Decryption must succeed without error because MFA keys are independent
      const decrypted = mfaService.decryptSecret(encryptedSecret);
      if (decrypted !== plainSecret) {
        throw new Error('MFA decryption failed after JWT_SECRET was rotated');
      }

      // Restore
      restoreEnv('JWT_SECRET', originalJwtSecret);
      restoreEnv('MFA_ENCRYPTION_KEY', originalEncKey);

      return { details: 'MFA encryption key is completely decoupled from JWT signing secrets' };
    });

    // -------------------------------------------------------------------------
    // 5. Versioned Key Rotation Strategy (v1 -> v2)
    // -------------------------------------------------------------------------
    await recordScenario(5, 'Versioned key rotation strategy: v1 secret decrypts with v1 key; new encryption uses v2 key', async () => {
      const keyV1 = crypto.randomBytes(32).toString('hex');
      const keyV2 = crypto.randomBytes(32).toString('hex');

      process.env.MFA_ENCRYPTION_KEY_V1 = keyV1;
      process.env.MFA_ENCRYPTION_KEY_V2 = keyV2;
      process.env.MFA_KEY_VERSION = 'v1';

      // Encrypt with v1
      const plainSecret = mfaService.generateSecret();
      const cipherV1 = mfaService.encryptSecret(plainSecret, 'v1');
      if (!cipherV1.startsWith('v1:')) throw new Error('Cipher missing v1 prefix');

      // Now switch active version to v2
      process.env.MFA_KEY_VERSION = 'v2';

      // Verify cipherV1 decrypts properly using v1 key
      const decryptedOld = mfaService.decryptSecret(cipherV1);
      if (decryptedOld !== plainSecret) throw new Error('v1 cipher failed to decrypt under v2 active environment');

      // Encrypt fresh secret: must use v2 key
      const cipherV2 = mfaService.encryptSecret(plainSecret);
      if (!cipherV2.startsWith('v2:')) throw new Error('Active encryption did not adopt v2 prefix');

      const decryptedNew = mfaService.decryptSecret(cipherV2);
      if (decryptedNew !== plainSecret) throw new Error('v2 cipher failed to decrypt with v2 key');

      // Cleanup env
      delete process.env.MFA_ENCRYPTION_KEY_V1;
      delete process.env.MFA_ENCRYPTION_KEY_V2;
      delete process.env.MFA_KEY_VERSION;
      restoreEnv('MFA_ENCRYPTION_KEY', originalEncKey);

      return { details: 'Multi-version key rotation (v1 -> v2) operates with zero downtime' };
    });

    // -------------------------------------------------------------------------
    // 6. Incorrect Key and GCM Authentication Failure
    // -------------------------------------------------------------------------
    await recordScenario(6, 'Decryption with mismatched key fails safely with authentication failure', async () => {
      const keyA = crypto.randomBytes(32).toString('hex');
      const keyB = crypto.randomBytes(32).toString('hex');

      process.env.MFA_ENCRYPTION_KEY = keyA;
      const plainSecret = mfaService.generateSecret();
      const encrypted = mfaService.encryptSecret(plainSecret);

      // Switch to wrong key B
      process.env.MFA_ENCRYPTION_KEY = keyB;

      let caught = false;
      try {
        mfaService.decryptSecret(encrypted);
      } catch (err: any) {
        if (err.message.includes('authentication tag') || err.message.includes('decryption failed')) {
          caught = true;
        }
      } finally {
        restoreEnv('MFA_ENCRYPTION_KEY', originalEncKey);
      }

      if (!caught) throw new Error('Decryption with wrong key did not throw GCM authentication failure');
      return { details: 'GCM authentication tag verification rejects wrong key safely' };
    });

    // -------------------------------------------------------------------------
    // 7. Persisted Challenge State Creation & Association
    // -------------------------------------------------------------------------
    await recordScenario(7, 'Admin login creates persisted challenge record with UUID jti in mfa_challenges', async () => {
      const adminEmail = `admin-ops-${testRunId}@aeonexus.security`;
      const pwdHash = await bcrypt.hash(adminPassword, 10);
      testAdminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: pwdHash,
          firstName: 'Admin',
          lastName: 'Ops',
          platformRole: PlatformRole.PLATFORM_ADMIN,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      const loginRes: any = await authService.login({
        email: adminEmail,
        password: adminPassword,
      });

      if (!loginRes.mfaRequired || !loginRes.mfaSetupRequired || !loginRes.mfaTicket) {
        throw new Error('Admin login failed to return MFA setup challenge ticket');
      }

      // Verify persisted challenge in database
      const challengeRecords = await prisma.mfaChallenge.findMany({
        where: { userId: testAdminUser.id },
      });

      if (challengeRecords.length !== 1) {
        throw new Error(`Expected 1 persisted challenge record in DB, found ${challengeRecords.length}`);
      }

      const rec = challengeRecords[0];
      if (rec.purpose !== 'MFA_SETUP') throw new Error(`Expected purpose MFA_SETUP, got ${rec.purpose}`);
      if (rec.consumedAt !== null) throw new Error('Challenge record marked consumed prematurely');
      if (rec.invalidatedAt !== null) throw new Error('Challenge record marked invalidated prematurely');
      if (rec.expiresAt.getTime() <= Date.now()) throw new Error('Challenge expiresAt is in the past');

      return { details: `Persisted challenge created: id=${rec.challengeId}, purpose=${rec.purpose}, expires in 5m` };
    });

    // -------------------------------------------------------------------------
    // 8. One-Time Challenge Consumption & Reuse Rejection
    // -------------------------------------------------------------------------
    let adminPlainSecret = '';
    let adminSetupTicket = '';

    await recordScenario(8, 'Setup challenge is consumed atomically and cannot be reused', async () => {
      // Get fresh login setup challenge
      const loginRes: any = await authService.login({
        email: testAdminUser.email,
        password: adminPassword,
      });
      adminSetupTicket = loginRes.mfaTicket;
      adminPlainSecret = loginRes.secret || (await authService.initiateAdminMfaSetup(adminSetupTicket)).secret;

      const validCode = mfaService.computeTotp(adminPlainSecret);

      // 1st consumption: MUST SUCCEED
      const setupRes = await authService.completeAdminMfaSetup(adminSetupTicket, validCode);
      if (!setupRes.tokens?.accessToken) throw new Error('First consumption of setup challenge failed');

      // Verify challenge marked consumed in DB
      const challenge = await prisma.mfaChallenge.findFirst({
        where: { userId: testAdminUser.id, purpose: 'MFA_SETUP', consumedAt: { not: null } },
      });
      if (!challenge) throw new Error('Challenge record not marked consumed in database');

      // 2nd consumption: MUST FAIL
      let reuseRejected = false;
      try {
        await authService.completeAdminMfaSetup(adminSetupTicket, validCode);
      } catch (err: any) {
        if (err.message.includes('consumed') || err.message.includes('invalid') || err.status === 401) {
          reuseRejected = true;
        }
      }

      if (!reuseRejected) throw new Error('Setup challenge was permitted to be reused!');
      return { details: 'Challenge atomically marked consumed; replay attempt rejected with 401' };
    });

    // -------------------------------------------------------------------------
    // 9. Concurrent Duplicate Challenge Consumption (Race Condition Protection)
    // -------------------------------------------------------------------------
    await recordScenario(9, 'Concurrent duplicate challenge submissions: exactly one succeeds, second rejected', async () => {
      // Reset mfaLastUsedStep so current timestamp TOTP is immediately valid
      await prisma.user.update({
        where: { id: testAdminUser.id },
        data: { mfaLastUsedStep: null },
      });

      // Login to get a fresh challenge for enrolled admin
      const loginChallenge: any = await authService.login({
        email: testAdminUser.email,
        password: adminPassword,
      });

      const ticket = loginChallenge.mfaTicket;
      const code = mfaService.computeTotp(adminPlainSecret);

      // Parallel submissions of the exact same challenge ticket
      const [res1, res2] = await Promise.allSettled([
        authService.mfaLogin({ mfaTicket: ticket, code }),
        authService.mfaLogin({ mfaTicket: ticket, code }),
      ]);

      const successCount = (res1.status === 'fulfilled' ? 1 : 0) + (res2.status === 'fulfilled' ? 1 : 0);
      const rejectCount = (res1.status === 'rejected' ? 1 : 0) + (res2.status === 'rejected' ? 1 : 0);

      if (successCount !== 1 || rejectCount !== 1) {
        throw new Error(`Challenge concurrency race condition failed: ${successCount} succeeded, ${rejectCount} rejected`);
      }

      return { details: 'Atomic conditional update ensured exactly 1 submission succeeded and duplicate was rejected' };
    });

    // -------------------------------------------------------------------------
    // 10. Challenge Purpose Confusion Rejection
    // -------------------------------------------------------------------------
    await recordScenario(10, 'Challenge purpose confusion rejected (mfa_setup_challenge cannot call mfaLogin)', async () => {
      const regEmail = `reg-ops-${testRunId}@aeonexus.security`;
      const regPwdHash = await bcrypt.hash(regularPassword, 10);
      testRegularUser = await prisma.user.create({
        data: {
          email: regEmail,
          passwordHash: regPwdHash,
          firstName: 'Regular',
          lastName: 'Ops',
          platformRole: null,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: true,
          mfaSecret: mfaService.encryptSecret(mfaService.generateSecret()),
        },
      });

      // Fabricate a setup challenge for this user
      const setupTicket = signJwtHmacSha256(
        {
          sub: testRegularUser.id,
          email: testRegularUser.email,
          type: 'mfa_setup_challenge',
          jti: crypto.randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 300,
        },
        process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min_32_chars',
      );

      let rejected = false;
      try {
        await authService.mfaLogin({
          mfaTicket: setupTicket,
          code: '123456',
        });
      } catch (err: any) {
        if (err.message.includes('purpose') || err.message.includes('invalid') || err.status === 401) {
          rejected = true;
        }
      }

      if (!rejected) throw new Error('mfaLogin accepted a setup challenge ticket');
      return { details: 'Purpose mismatch rejected with UnauthorizedException' };
    });

    // -------------------------------------------------------------------------
    // 11. Challenge Expiration Rejection
    // -------------------------------------------------------------------------
    await recordScenario(11, 'Expired challenge record in database rejected even if JWT has not expired', async () => {
      const challengeId = crypto.randomUUID();
      // Record in database expired 1 minute ago
      await prisma.mfaChallenge.create({
        data: {
          userId: testRegularUser.id,
          challengeId,
          purpose: 'MFA_LOGIN',
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      const ticket = signJwtHmacSha256(
        {
          sub: testRegularUser.id,
          email: testRegularUser.email,
          type: 'mfa_challenge',
          jti: challengeId,
          exp: Math.floor(Date.now() / 1000) + 300,
        },
        process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min_32_chars',
      );

      let rejected = false;
      try {
        await authService.mfaLogin({
          mfaTicket: ticket,
          code: '123456',
        });
      } catch (err: any) {
        if (err.message.includes('expired') || err.message.includes('invalid') || err.status === 401) {
          rejected = true;
        }
      }

      if (!rejected) throw new Error('Expired database challenge record was accepted');
      return { details: 'Database challenge expiration strictly verified and rejected' };
    });

    // -------------------------------------------------------------------------
    // 12. Recovery Code Migration (Legacy SHA-256 Support & Decrement)
    // -------------------------------------------------------------------------
    await recordScenario(12, 'Legacy SHA-256 recovery codes validated, consumed atomically, and identified as legacy', async () => {
      const plaintextCode = 'A1B2C3-D4E5F6';
      const legacyHash = mfaService.hashRecoveryCodeLegacy(plaintextCode);
      const modernCode = 'F1E2D3-C4B5A6';
      const modernHash = mfaService.hashRecoveryCode(modernCode);

      const storedCodes = [legacyHash, modernHash];

      // 1. Consume legacy code
      const legacyRes = mfaService.verifyAndConsumeRecoveryCode(plaintextCode, storedCodes);
      if (!legacyRes.valid || !legacyRes.isLegacy) {
        throw new Error('Legacy code was not validated or not identified as legacy');
      }
      if (legacyRes.remainingHashedCodes.length !== 1 || legacyRes.remainingHashedCodes[0] !== modernHash) {
        throw new Error('Remaining codes array did not preserve modern hash');
      }

      // 2. Consume modern code
      const modernRes = mfaService.verifyAndConsumeRecoveryCode(modernCode, legacyRes.remainingHashedCodes);
      if (!modernRes.valid || modernRes.isLegacy) {
        throw new Error('Modern code was incorrectly identified as legacy');
      }
      if (modernRes.remainingHashedCodes.length !== 0) {
        throw new Error('Expected 0 remaining recovery codes');
      }

      return { details: 'Seamless legacy SHA-256 and modern keyed HMAC-SHA256 recovery code coexistence verified' };
    });

    // -------------------------------------------------------------------------
    // 13. Recovery Code Regeneration Lifecycle (Step-Up Authentication)
    // -------------------------------------------------------------------------
    await recordScenario(13, 'User can regenerate 10 fresh recovery codes atomically with step-up auth', async () => {
      const regPlainSecret = mfaService.decryptSecret(testRegularUser.mfaSecret!);
      const validCode = mfaService.computeTotp(regPlainSecret);
      const regenRes = await authService.regenerateRecoveryCodes(testRegularUser.id, {
        password: regularPassword,
        code: validCode,
      });
      if (!regenRes.recoveryCodes || regenRes.recoveryCodes.length !== 10) {
        throw new Error(`Expected 10 regenerated codes, got ${regenRes.recoveryCodes?.length}`);
      }

      const updatedUser = await prisma.user.findUnique({ where: { id: testRegularUser.id } });
      if (updatedUser?.mfaRecoveryCodes?.length !== 10) {
        throw new Error('User recovery codes in DB not updated to 10');
      }

      // Check format
      for (const code of regenRes.recoveryCodes) {
        if (!/^[0-9A-F]{6}-[0-9A-F]{6}$/i.test(code)) {
          throw new Error(`Regenerated code format invalid: ${code}`);
        }
      }

      return { details: '10 fresh keyed recovery codes generated and persisted atomically' };
    });

  } finally {
    // Cleanup test fixtures
    if (testAdminUser?.id) {
      await prisma.mfaChallenge.deleteMany({ where: { userId: testAdminUser.id } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: testAdminUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testAdminUser.id } }).catch(() => {});
    }
    if (testRegularUser?.id) {
      await prisma.mfaChallenge.deleteMany({ where: { userId: testRegularUser.id } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: testRegularUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testRegularUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary Reporting
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('   Phase 7A.2 MFA Operational Test Execution Summary');
  console.log('===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${passedCount}`);
  console.log(`Failed:          ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFailed scenarios:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.error(`  - Scenario ${r.scenario}: ${r.name} -> ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\nALL 13 OPERATIONAL & KEY ROTATION SCENARIOS PASSED VERIFICATION.');
  }
}

runPhase7a2OperationalSuite().catch((err) => {
  console.error('Fatal execution error in Phase 7A.2 suite:', err);
  process.exit(1);
});
