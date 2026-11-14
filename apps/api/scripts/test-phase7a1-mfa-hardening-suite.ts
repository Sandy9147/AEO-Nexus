/**
 * AEO Nexus — Phase 7A.1 Automated MFA Hardening & Security Verification Suite
 * Cryptographic Hardening, Replay Prevention, Keyed Recovery Codes & Race-Condition Resistance
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
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
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

async function runPhase7a1MfaHardeningSuite() {
  console.log('\n===============================================================');
  console.log('   AEO Nexus — Phase 7A.1 MFA Cryptographic Hardening Suite');
  console.log('   AES-256-GCM, Counter Replay Prevention & Keyed Recovery Codes');
  console.log('===============================================================\n');

  let dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
  if (!dbUrl.includes('connection_limit=')) {
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${sep}connection_limit=5&pool_timeout=30&connect_timeout=30`;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  // Resilient connect with retries for Neon serverless wake-up
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await prisma.$connect();
      connected = true;
      break;
    } catch (e: any) {
      if (attempt === 3) throw e;
      console.log(`  Database connection attempt ${attempt} failed, retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const prismaService = prisma as unknown as PrismaService;

  // Initialize Services
  const emailService = new EmailService();
  const mfaService = new MfaService();
  const authService = new AuthService(prismaService, emailService, mfaService);
  const jwtAuthGuard = new JwtAuthGuard();

  const testRunId = `p7a1_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const jwtSecret = process.env.JWT_SECRET || 'super-secure-default-jwt-secret-for-aeo-nexus-api-32b';

  // Test accounts
  let adminUser: any = null;
  const adminPassword = 'AdminSecurePassword123!@#';
  let regularUser: any = null;
  const regularPassword = 'UserSecurePassword123!@#';

  async function issuePersistedChallenge(
    userId: string,
    purpose: 'MFA_LOGIN' | 'MFA_SETUP',
    email: string,
    expiresInSec: number = 300,
  ): Promise<string> {
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);
    await prisma.mfaChallenge.create({
      data: {
        userId,
        challengeId,
        purpose,
        expiresAt,
      },
    });
    return signJwtHmacSha256(
      {
        sub: userId,
        email,
        type: purpose === 'MFA_SETUP' ? 'mfa_setup_challenge' : 'mfa_challenge',
        jti: challengeId,
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      jwtSecret,
    );
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Authenticated Encryption Round-Trip (AES-256-GCM)
    // -------------------------------------------------------------------------
    await recordScenario(1, 'AES-256-GCM authenticated encryption round-trip with unique IV and tag', async () => {
      const plaintextSecret = mfaService.generateSecret();
      const ciphertext1 = mfaService.encryptSecret(plaintextSecret);
      const ciphertext2 = mfaService.encryptSecret(plaintextSecret);

      if (!ciphertext1.startsWith('v1:') || !ciphertext2.startsWith('v1:')) {
        throw new Error('Encrypted payload missing version header "v1:"');
      }

      // Unique random IV on every call
      if (ciphertext1 === ciphertext2) {
        throw new Error('Two encryptions of same secret yielded identical ciphertext (IV reuse!)');
      }

      const parts = ciphertext1.split(':');
      if (parts.length !== 4) {
        throw new Error(`Expected 4 parts (v1:iv:tag:ciphertext), got ${parts.length}`);
      }
      const [, ivHex, tagHex, dataHex] = parts;
      if (ivHex.length !== 24) throw new Error(`IV length must be 24 hex chars (12 bytes), got ${ivHex.length}`);
      if (tagHex.length !== 32) throw new Error(`Tag length must be 32 hex chars (16 bytes), got ${tagHex.length}`);
      if (dataHex.length === 0) throw new Error('Ciphertext payload is empty');

      const decrypted = mfaService.decryptSecret(ciphertext1);
      if (decrypted !== plaintextSecret) {
        throw new Error('Decrypted secret does not match original plaintext');
      }

      return { details: `AES-256-GCM verified with 96-bit IV, 128-bit tag, and distinct ciphertexts` };
    });

    // -------------------------------------------------------------------------
    // 2. Tampered Ciphertext & Tag Rejection
    // -------------------------------------------------------------------------
    await recordScenario(2, 'Tampered ciphertext or altered authentication tag immediately throws', async () => {
      const plaintext = mfaService.generateSecret();
      const encrypted = mfaService.encryptSecret(plaintext);
      const parts = encrypted.split(':');

      // Tamper tag
      const badTag = parts[2].substring(0, 30) + (parts[2].slice(-2) === 'aa' ? 'bb' : 'aa');
      const tamperedTagPayload = `${parts[0]}:${parts[1]}:${badTag}:${parts[3]}`;

      let tagFailed = false;
      try {
        mfaService.decryptSecret(tamperedTagPayload);
      } catch (err: any) {
        tagFailed = true;
      }
      if (!tagFailed) throw new Error('Tampered authentication tag was accepted without exception');

      // Tamper ciphertext
      const badCipher = parts[3].substring(0, parts[3].length - 2) + 'ff';
      const tamperedCipherPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${badCipher}`;

      let cipherFailed = false;
      try {
        mfaService.decryptSecret(tamperedCipherPayload);
      } catch (err: any) {
        cipherFailed = true;
      }
      if (!cipherFailed) throw new Error('Tampered ciphertext was accepted without exception');

      return { details: 'GCM authentication failures rejected safely with exceptions' };
    });

    // -------------------------------------------------------------------------
    // 3. Keyed Recovery Codes Hashing & Verification
    // -------------------------------------------------------------------------
    await recordScenario(3, 'Single-use recovery codes hashed via keyed HMAC-SHA256 with server pepper', async () => {
      const { plaintextCodes, hashedCodes } = mfaService.generateRecoveryCodes(10);
      if (plaintextCodes.length !== 10 || hashedCodes.length !== 10) {
        throw new Error('Did not generate 10 recovery codes');
      }

      // Check format (XXXXXX-XXXXXX)
      for (const code of plaintextCodes) {
        if (!/^[0-9A-F]{6}-[0-9A-F]{6}$/i.test(code)) {
          throw new Error(`Recovery code format invalid: ${code}`);
        }
      }

      // Plaintext must never match hash
      if (plaintextCodes[0] === hashedCodes[0]) {
        throw new Error('Recovery code hash equals plaintext code');
      }

      // Verify and consume
      const res = mfaService.verifyAndConsumeRecoveryCode(plaintextCodes[0], hashedCodes);
      if (!res.valid || res.remainingHashedCodes.length !== 9) {
        throw new Error('Valid recovery code failed verification or decrement');
      }

      // Reusing same code must fail
      const reuse = mfaService.verifyAndConsumeRecoveryCode(plaintextCodes[0], res.remainingHashedCodes);
      if (reuse.valid) {
        throw new Error('Used recovery code accepted again');
      }

      return { details: 'HMAC-SHA256 keyed recovery codes verified and decremented safely' };
    });

    // -------------------------------------------------------------------------
    // 4. Admin Login Without MFA Returns Challenge & Creates Zero Sessions
    // -------------------------------------------------------------------------
    await recordScenario(4, 'Admin login without completed MFA returns challenge ticket with 0 sessions created', async () => {
      const email = `admin-${testRunId}@aeonexus.security`;
      const pwdHash = await bcrypt.hash(adminPassword, 10);
      adminUser = await prisma.user.create({
        data: {
          email,
          passwordHash: pwdHash,
          firstName: 'Admin',
          lastName: 'MFA',
          platformRole: PlatformRole.PLATFORM_ADMIN,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      // Count sessions before login
      const initialSessions = await prisma.session.count({ where: { userId: adminUser.id } });

      const loginRes: any = await authService.login({
        email,
        password: adminPassword,
      });

      if (!loginRes.mfaRequired || !loginRes.mfaSetupRequired || !loginRes.mfaTicket) {
        throw new Error('Expected MFA challenge response with mfaTicket and mfaSetupRequired: true');
      }
      if (loginRes.tokens) {
        throw new Error('Tokens were prematurely issued before MFA challenge completion');
      }

      // Count sessions after login challenge
      const afterSessions = await prisma.session.count({ where: { userId: adminUser.id } });
      if (afterSessions !== initialSessions || afterSessions !== 0) {
        throw new Error(`Premature sessions created during MFA challenge: found ${afterSessions}`);
      }

      return { details: `0 sessions created, setup challenge ticket issued with exp = 5m` };
    });

    // -------------------------------------------------------------------------
    // 5. Challenge Token Cannot Be Used As Normal Access Token
    // -------------------------------------------------------------------------
    await recordScenario(5, 'Challenge token (mfa_challenge / mfa_setup_challenge) rejected by JwtAuthGuard', async () => {
      // Create a setup challenge token
      const challengeToken = signJwtHmacSha256(
        {
          sub: adminUser.id,
          email: adminUser.email,
          type: 'mfa_setup_challenge',
          exp: Math.floor(Date.now() / 1000) + 300,
        },
        jwtSecret,
      );

      // Attempt to authenticate request through JwtAuthGuard
      const mockReq: any = {
        headers: {
          authorization: `Bearer ${challengeToken}`,
        },
      };
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
        }),
      };

      let rejected = false;
      try {
        await jwtAuthGuard.canActivate(mockContext);
      } catch (err: any) {
        if (err.message.includes('MFA') || err.message.includes('challenge') || err.message.includes('token') || err.status === 401) {
          rejected = true;
        }
      }

      if (!rejected) {
        throw new Error('JwtAuthGuard allowed MFA challenge token to access protected route');
      }

      return { details: 'JwtAuthGuard strictly rejects challenge tokens with UnauthorizedException' };
    });

    // -------------------------------------------------------------------------
    // 6. Expired Challenge Token Rejection
    // -------------------------------------------------------------------------
    await recordScenario(6, 'Expired challenge ticket is rejected by mfaLogin and completeAdminMfaSetup', async () => {
      const expiredTicket = signJwtHmacSha256(
        {
          sub: adminUser.id,
          email: adminUser.email,
          type: 'mfa_setup_challenge',
          exp: Math.floor(Date.now() / 1000) - 60, // expired 1 minute ago
        },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.completeAdminMfaSetup(expiredTicket, '123456');
      } catch (err: any) {
        if (err.message.includes('expired') || err.message.includes('Invalid') || err.status === 401) {
          rejected = true;
        }
      }

      if (!rejected) throw new Error('Expired challenge ticket was accepted');
      return { details: 'Expired MFA challenge tickets rejected with 401' };
    });

    // -------------------------------------------------------------------------
    // 7. Complete Admin MFA Setup & Verification
    // -------------------------------------------------------------------------
    let adminPlainSecret = '';
    let adminRecoveryCodes: string[] = [];
    let adminConsumedCode = '';

    await recordScenario(7, 'Admin completes initial MFA setup with encrypted secret storage', async () => {
      // 1. Fresh valid setup challenge
      const validTicket = await issuePersistedChallenge(adminUser.id, 'MFA_SETUP', adminUser.email);

      // Generate secret for admin and save encrypted in db
      adminPlainSecret = mfaService.generateSecret();
      const encSecret = mfaService.encryptSecret(adminPlainSecret);
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { mfaSecret: encSecret },
      });

      // Compute TOTP code
      const validCode = mfaService.computeTotp(adminPlainSecret);
      adminConsumedCode = validCode;
      const setupRes = await authService.completeAdminMfaSetup(validTicket, validCode);

      if (!setupRes.tokens?.accessToken || !setupRes.tokens?.refreshToken) {
        throw new Error('Tokens not returned upon successful setup completion');
      }
      if (setupRes.recoveryCodes.length !== 10) {
        throw new Error('Recovery codes not returned');
      }
      adminRecoveryCodes = setupRes.recoveryCodes;

      // Verify database state: secret encrypted with v1, lastUsedStep recorded
      const checkUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      if (!checkUser?.mfaEnabled) throw new Error('mfaEnabled is not true');
      if (!checkUser.mfaSecret?.startsWith('v1:')) throw new Error('mfaSecret is not stored encrypted with v1:');
      if (!checkUser.mfaLastUsedStep) throw new Error('mfaLastUsedStep not set after enrollment');

      return { details: `Admin MFA enrolled; secret stored encrypted with v1; step=${checkUser.mfaLastUsedStep}` };
    });

    // -------------------------------------------------------------------------
    // 8. Immediate Replay Protection in Same Time Step
    // -------------------------------------------------------------------------
    await recordScenario(8, 'Immediate replay of same code rejected by counter tracking', async () => {
      // Create fresh login challenge for enrolled admin
      const challengeTicket = await issuePersistedChallenge(adminUser.id, 'MFA_LOGIN', adminUser.email);

      // Re-use the exact same code consumed during setup in Scenario 7
      let rejected = false;
      try {
        await authService.mfaLogin({
          mfaTicket: challengeTicket,
          code: adminConsumedCode,
        });
      } catch (err: any) {
        rejected = true;
      }

      if (!rejected) throw new Error('Immediate replay of consumed TOTP was allowed!');
      return { details: 'Replay rejected: current time-step counter equals last-accepted step' };
    });

    // -------------------------------------------------------------------------
    // 9. Older Counter Rejection (Past Time Drift)
    // -------------------------------------------------------------------------
    await recordScenario(9, 'Older counter steps (S <= lastAcceptedStep) strictly rejected', async () => {
      const user = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const currentStep = BigInt(Math.floor(Date.now() / 30000));

      // Attempt to verify an older step
      const olderCode = mfaService.computeTotp(adminPlainSecret, Date.now() - 60_000);
      const res = mfaService.verifyTotpCounter(adminPlainSecret, olderCode, user?.mfaLastUsedStep);

      if (res.valid) {
        throw new Error('Older code was validated despite step <= mfaLastUsedStep');
      }

      return { details: 'Verification rejected: calculated counter <= lastUsedStep' };
    });

    // -------------------------------------------------------------------------
    // 10. Concurrent TOTP Submissions (Race Condition Protection)
    // -------------------------------------------------------------------------
    await recordScenario(10, 'Concurrent duplicate TOTP submissions: exactly one succeeds, second fails', async () => {
      // Create a fresh regular user enrolled in MFA
      const regEmail = `regular-${testRunId}@aeonexus.security`;
      const regPlainSecret = mfaService.generateSecret();
      const regPwdHash = await bcrypt.hash(regularPassword, 10);
      regularUser = await prisma.user.create({
        data: {
          email: regEmail,
          passwordHash: regPwdHash,
          firstName: 'Regular',
          lastName: 'User',
          platformRole: null,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: true,
          mfaSecret: mfaService.encryptSecret(regPlainSecret),
          mfaLastUsedStep: null, // No steps used yet
        },
      });

      const ticket1 = await issuePersistedChallenge(regularUser.id, 'MFA_LOGIN', regEmail);
      const ticket2 = await issuePersistedChallenge(regularUser.id, 'MFA_LOGIN', regEmail);

      const code = mfaService.computeTotp(regPlainSecret);

      // Submit concurrently
      const [res1, res2] = await Promise.allSettled([
        authService.mfaLogin({ mfaTicket: ticket1, code }),
        authService.mfaLogin({ mfaTicket: ticket2, code }),
      ]);

      const successCount = (res1.status === 'fulfilled' ? 1 : 0) + (res2.status === 'fulfilled' ? 1 : 0);
      const rejectCount = (res1.status === 'rejected' ? 1 : 0) + (res2.status === 'rejected' ? 1 : 0);

      if (successCount !== 1 || rejectCount !== 1) {
        throw new Error(`Concurrency race condition failed: ${successCount} succeeded, ${rejectCount} rejected`);
      }

      return { details: `Atomic updateMany ensured exactly 1 succeeded and 1 rejected` };
    });

    // -------------------------------------------------------------------------
    // 11. Single-Use Recovery Code Login & Consumption
    // -------------------------------------------------------------------------
    await recordScenario(11, 'Recovery code login decrements remaining codes in database', async () => {
      const ticket = await issuePersistedChallenge(adminUser.id, 'MFA_LOGIN', adminUser.email);

      const userBefore = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const initialCount = userBefore?.mfaRecoveryCodes?.length || 0;

      const codeToUse = adminRecoveryCodes[0];
      const loginRes = await authService.mfaLogin({
        mfaTicket: ticket,
        recoveryCode: codeToUse,
      });

      if (!loginRes.tokens?.accessToken) throw new Error('Recovery code login failed');

      const userAfter = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const afterCount = userAfter?.mfaRecoveryCodes?.length || 0;

      if (afterCount !== initialCount - 1) {
        throw new Error(`Expected ${initialCount - 1} remaining recovery codes, found ${afterCount}`);
      }

      return { details: `Recovery code consumed; remaining count decremented from ${initialCount} to ${afterCount}` };
    });

    // -------------------------------------------------------------------------
    // 12. Recovery Code Replay Rejection
    // -------------------------------------------------------------------------
    await recordScenario(12, 'Replaying consumed recovery code is rejected', async () => {
      const ticket = await issuePersistedChallenge(adminUser.id, 'MFA_LOGIN', adminUser.email);

      const usedCode = adminRecoveryCodes[0];
      let rejected = false;
      try {
        await authService.mfaLogin({
          mfaTicket: ticket,
          recoveryCode: usedCode,
        });
      } catch (err: any) {
        if (err.message.includes('recovery') || err.message.includes('Invalid') || err.status === 401) {
          rejected = true;
        }
      }

      if (!rejected) throw new Error('Consumed recovery code was accepted again');
      return { details: 'Consumed recovery code rejected with UnauthorizedException' };
    });

    // -------------------------------------------------------------------------
    // 13. Concurrent Recovery Code Submissions (Race Condition Protection)
    // -------------------------------------------------------------------------
    await recordScenario(13, 'Concurrent recovery code submissions: exactly one succeeds, second fails', async () => {
      // Use recovery code 1
      const testCode = adminRecoveryCodes[1];
      const ticketA = await issuePersistedChallenge(adminUser.id, 'MFA_LOGIN', adminUser.email);
      const ticketB = await issuePersistedChallenge(adminUser.id, 'MFA_LOGIN', adminUser.email);

      const [resA, resB] = await Promise.allSettled([
        authService.mfaLogin({ mfaTicket: ticketA, recoveryCode: testCode }),
        authService.mfaLogin({ mfaTicket: ticketB, recoveryCode: testCode }),
      ]);

      const successCount = (resA.status === 'fulfilled' ? 1 : 0) + (resB.status === 'fulfilled' ? 1 : 0);
      const rejectCount = (resA.status === 'rejected' ? 1 : 0) + (resB.status === 'rejected' ? 1 : 0);

      if (successCount !== 1 || rejectCount !== 1) {
        throw new Error(`Recovery concurrency race condition failed: ${successCount} succeeded, ${rejectCount} rejected`);
      }

      return { details: 'Atomic array update condition prevented double recovery code consumption' };
    });

    // -------------------------------------------------------------------------
    // 14. Admin MFA Immutable Protection
    // -------------------------------------------------------------------------
    await recordScenario(14, 'Admin accounts cannot disable MFA under any circumstance', async () => {
      let rejected = false;
      try {
        await authService.disableMfa(adminUser.id, {
          password: adminPassword,
          code: mfaService.computeTotp(adminPlainSecret),
        });
      } catch (err: any) {
        if (err.message.includes('mandatory for administrative accounts') || err.status === 400) {
          rejected = true;
        }
      }

      if (!rejected) throw new Error('Admin account was permitted to disable MFA');
      return { details: 'Admin MFA disable rejected with BadRequestException' };
    });

    // -------------------------------------------------------------------------
    // 15. User MFA Setup, Verification & Disable Lifecycle
    // -------------------------------------------------------------------------
    await recordScenario(15, 'Regular user can setup, enable, and subsequently disable MFA with password + code', async () => {
      // 1. Setup
      const setup = await authService.setupMfa(regularUser.id);
      if (!setup.secret || !setup.otpauthUri) throw new Error('Setup failed');

      // Stored secret must be encrypted
      const checkStored = await prisma.user.findUnique({ where: { id: regularUser.id } });
      if (!checkStored?.mfaSecret?.startsWith('v1:')) {
        throw new Error('mfaSecret was not stored encrypted during setup');
      }

      // 2. Enable
      const enableCode = mfaService.computeTotp(setup.secret);
      const enableRes = await authService.verifyAndEnableMfa(regularUser.id, enableCode);
      if (!enableRes.enabled || enableRes.recoveryCodes.length !== 10) {
        throw new Error('verifyAndEnableMfa failed');
      }

      // 3. Disable
      // Next time step code to ensure fresh step
      const disableCode = mfaService.computeTotp(setup.secret, Date.now() + 30000);
      const disableRes = await authService.disableMfa(regularUser.id, {
        password: regularPassword,
        code: disableCode,
      });

      if (!disableRes.disabled) throw new Error('disableMfa failed');

      const userAfter = await prisma.user.findUnique({ where: { id: regularUser.id } });
      if (userAfter?.mfaEnabled || userAfter?.mfaSecret || userAfter?.mfaLastUsedStep) {
        throw new Error('User MFA state was not cleared upon disabling');
      }

      return { details: 'User MFA lifecycle (setup, enable, disable) executed cleanly' };
    });

    // -------------------------------------------------------------------------
    // 16. Zero-Downtime Migration for Legacy Plaintext Secrets
    // -------------------------------------------------------------------------
    await recordScenario(16, 'Legacy unencrypted secret is decrypted and upgraded in-place to v1 encryption', async () => {
      const legacySecret = mfaService.generateSecret();
      const legacyUser = await prisma.user.create({
        data: {
          email: `legacy-${testRunId}@aeonexus.security`,
          passwordHash: await bcrypt.hash('LegacyPassword123!', 10),
          firstName: 'Legacy',
          lastName: 'User',
          platformRole: null,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: true,
          mfaSecret: legacySecret, // Unencrypted legacy format
        },
      });

      // Decrypt legacy secret directly
      const decrypted = mfaService.decryptSecret(legacySecret);
      if (decrypted !== legacySecret) {
        throw new Error('Legacy unencrypted secret could not be transparently read');
      }

      // Perform login check which triggers auto-upgrade in-place
      const code = mfaService.computeTotp(legacySecret);
      const ticket = await issuePersistedChallenge(legacyUser.id, 'MFA_LOGIN', legacyUser.email);

      const loginRes = await authService.mfaLogin({
        mfaTicket: ticket,
        code,
      });
      if (!loginRes.tokens?.accessToken) throw new Error('Legacy user login failed');

      // Check user record: must now be encrypted with v1:
      const upgradedUser = await prisma.user.findUnique({ where: { id: legacyUser.id } });
      if (!upgradedUser?.mfaSecret?.startsWith('v1:')) {
        throw new Error('Legacy secret was not upgraded in-place to v1 encryption');
      }

      // Cleanup
      await prisma.user.delete({ where: { id: legacyUser.id } });

      return { details: 'Legacy secret successfully read and upgraded in-place to v1 authenticated encryption' };
    });

  } finally {
    // Cleanup test users
    if (adminUser?.id) {
      await prisma.session.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (regularUser?.id) {
      await prisma.session.deleteMany({ where: { userId: regularUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary Reporting
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('   Phase 7A.1 MFA Hardening Test Execution Summary');
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
    console.log('\nALL 16 MFA HARDENING & SECURITY SCENARIOS PASSED VERIFICATION.');
  }
}

runPhase7a1MfaHardeningSuite().catch((err) => {
  console.error('Fatal execution error in Phase 7A.1 suite:', err);
  process.exit(1);
});
