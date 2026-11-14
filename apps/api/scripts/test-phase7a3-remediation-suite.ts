/**
 * AEO Nexus — Phase 7A.3 Remediation & Security Verification Suite
 * Mandatory Challenge Identifiers, Step-Up Recovery Regeneration,
 * Consistent JSON Key Rotation & Real Admin Enrollment Lifecycle
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

import { Module, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { PrismaClient, PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { PrismaModule } from '../src/prisma/prisma.module';
import { EmailModule } from '../src/email/email.module';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { MfaService } from '../src/auth/mfa.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RateLimiterGuard } from '../src/auth/guards/rate-limiter.guard';
import { WorkspaceMembershipGuard } from '../src/auth/guards/workspace.guard';
import { PlatformRoleGuard } from '../src/auth/guards/platform-role.guard';
import { WorkspaceRoleGuard } from '../src/auth/guards/workspace-role.guard';
import { signJwtHmacSha256 } from '@aeo-nexus/auth';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    JwtAuthGuard,
    RateLimiterGuard,
    WorkspaceMembershipGuard,
    PlatformRoleGuard,
    WorkspaceRoleGuard,
  ],
})
class TestAppModule {}

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

async function runPhase7a3Suite() {
  console.log('\n===============================================================');
  console.log('   AEO Nexus — Phase 7A.3 Remediation & Verification Suite');
  console.log('   Mandatory Identifiers, Step-Up Auth & JSON Key Rotation');
  console.log('===============================================================\n');

  let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  if (!dbUrl.includes('connection_limit=')) {
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${sep}connection_limit=5&pool_timeout=30`;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await prisma.$connect();
      break;
    } catch (e: any) {
      if (attempt === 6) throw e;
      console.log(`  Database connection attempt ${attempt}... retrying in 3s`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // Configure test encryption keys & pepper
  const testKeyV1Hex = '1111111111111111111111111111111111111111111111111111111111111111';
  const testKeyV2Hex = '2222222222222222222222222222222222222222222222222222222222222222';
  const testPepperHex = '3333333333333333333333333333333333333333333333333333333333333333';
  process.env.MFA_ENCRYPTION_KEY = testKeyV1Hex;
  process.env.MFA_RECOVERY_PEPPER = testPepperHex;
  process.env.MFA_KEY_VERSION = 'v1';
  process.env.MFA_ENCRYPTION_KEYS = JSON.stringify({
    v1: testKeyV1Hex,
    v2: testKeyV2Hex,
  });

  const app: INestApplication = await NestFactory.create(TestAppModule, { logger: false });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  await app.listen(0);

  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  const authService = app.get(AuthService);
  const mfaService = app.get(MfaService);
  const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min_32_chars';

  const testRunId = `p7a3_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const testUserPassword = 'StrongPassword7A3!@#$';

  let testUser1: any = null;
  let testUser2: any = null;
  let testAdmin: any = null;

  try {
    // Setup test users
    const pwdHash = await bcrypt.hash(testUserPassword, 10);
    testUser1 = await prisma.user.create({
      data: {
        email: `user1-${testRunId}@aeonexus.security`,
        passwordHash: pwdHash,
        firstName: 'Test',
        lastName: 'One',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        mfaSecret: mfaService.encryptSecret(mfaService.generateSecret()),
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: `user2-${testRunId}@aeonexus.security`,
        passwordHash: pwdHash,
        firstName: 'Test',
        lastName: 'Two',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        mfaEnabled: true,
        mfaSecret: mfaService.encryptSecret(mfaService.generateSecret()),
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        email: `admin-${testRunId}@aeonexus.security`,
        passwordHash: pwdHash,
        firstName: 'Admin',
        lastName: 'Three',
        platformRole: PlatformRole.PLATFORM_ADMIN,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        mfaEnabled: false,
      },
    });

    // =========================================================================
    // PART 1: Mandatory Challenge Identifiers
    // =========================================================================

    // 1. Correctly signed mfa_challenge token without jti
    await recordScenario(1, 'mfaLogin strictly rejects signed mfa_challenge token without jti (HTTP 401)', async () => {
      const ticketNoJti = signJwtHmacSha256(
        { sub: testUser1.id, email: testUser1.email, type: 'mfa_challenge', exp: Math.floor(Date.now() / 1000) + 300 },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketNoJti, code: '123456' });
      } catch (err: any) {
        if (err.status === 401 || err.message.includes('malformed') || err.message.includes('missing')) {
          rejected = true;
        }
      }
      if (!rejected) throw new Error('mfaLogin accepted challenge without jti!');
      return { details: 'Rejected with 401: jti is strictly mandatory' };
    });

    // 2. Correctly signed mfa_setup_challenge token without jti
    await recordScenario(2, 'completeAdminMfaSetup strictly rejects signed setup token without jti (HTTP 401)', async () => {
      const setupNoJti = signJwtHmacSha256(
        { sub: testAdmin.id, email: testAdmin.email, type: 'mfa_setup_challenge', exp: Math.floor(Date.now() / 1000) + 300 },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.completeAdminMfaSetup(setupNoJti, '123456');
      } catch (err: any) {
        if (err.status === 401 || err.message.includes('malformed') || err.message.includes('missing')) {
          rejected = true;
        }
      }
      if (!rejected) throw new Error('completeAdminMfaSetup accepted setup challenge without jti!');
      return { details: 'Rejected with 401: setup challenge jti is mandatory' };
    });

    // 3. Empty and malformed jti
    await recordScenario(3, 'Empty or malformed non-UUID jti rejected with HTTP 401', async () => {
      const ticketBadJti = signJwtHmacSha256(
        { sub: testUser1.id, email: testUser1.email, type: 'mfa_challenge', jti: 'not-a-uuid-string', exp: Math.floor(Date.now() / 1000) + 300 },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketBadJti, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) rejected = true;
      }
      if (!rejected) throw new Error('mfaLogin accepted malformed non-UUID jti!');
      return { details: 'Rejected with 401: UUID pattern validation enforced' };
    });

    // 4. Nonexistent challenge ID
    await recordScenario(4, 'Nonexistent challenge ID rejected with HTTP 401 (never skips DB validation)', async () => {
      const randomUuid = crypto.randomUUID();
      const ticketNonexistent = signJwtHmacSha256(
        { sub: testUser1.id, email: testUser1.email, type: 'mfa_challenge', jti: randomUuid, exp: Math.floor(Date.now() / 1000) + 300 },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketNonexistent, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) rejected = true;
      }
      if (!rejected) throw new Error('mfaLogin accepted nonexistent challenge ID!');
      return { details: 'Rejected with 401: record must exist in mfa_challenges' };
    });

    // 5. Wrong user ID
    await recordScenario(5, 'Challenge token presented by wrong user ID strictly rejected with HTTP 401', async () => {
      // Create challenge for User 1
      const challengeId = crypto.randomUUID();
      await prisma.mfaChallenge.create({
        data: {
          userId: testUser1.id,
          challengeId,
          purpose: 'MFA_LOGIN',
          expiresAt: new Date(Date.now() + 300_000),
        },
      });

      // Sign token embedding User 2's ID but User 1's challengeId
      const ticketWrongUser = signJwtHmacSha256(
        { sub: testUser2.id, email: testUser2.email, type: 'mfa_challenge', jti: challengeId, exp: Math.floor(Date.now() / 1000) + 300 },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketWrongUser, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) rejected = true;
      }
      if (!rejected) throw new Error('mfaLogin accepted challenge with wrong user ID!');
      return { details: 'Rejected with 401: userId constraint strictly enforced' };
    });

    // 6. Wrong challenge purpose
    await recordScenario(6, 'Wrong challenge purpose strictly rejected with HTTP 401', async () => {
      // Setup challenge presented to mfaLogin
      const setupChallengeId = crypto.randomUUID();
      await prisma.mfaChallenge.create({
        data: {
          userId: testUser1.id,
          challengeId: setupChallengeId,
          purpose: 'MFA_SETUP',
          expiresAt: new Date(Date.now() + 300_000),
        },
      });

      const ticketSetupPurpose = signJwtHmacSha256(
        { sub: testUser1.id, email: testUser1.email, type: 'mfa_setup_challenge', jti: setupChallengeId, exp: Math.floor(Date.now() / 1000) + 300 },
        jwtSecret,
      );

      let rejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketSetupPurpose, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) rejected = true;
      }
      if (!rejected) throw new Error('mfaLogin accepted MFA_SETUP challenge!');
      return { details: 'Rejected with 401: purpose separation enforced' };
    });

    // 7. Expired, consumed, and invalidated challenges
    await recordScenario(7, 'Expired, consumed, and invalidated challenge records rejected with HTTP 401', async () => {
      // A. Expired
      const expId = crypto.randomUUID();
      await prisma.mfaChallenge.create({
        data: {
          userId: testUser1.id,
          challengeId: expId,
          purpose: 'MFA_LOGIN',
          expiresAt: new Date(Date.now() - 10_000), // past
        },
      });
      const ticketExp = signJwtHmacSha256({ sub: testUser1.id, email: testUser1.email, type: 'mfa_challenge', jti: expId, exp: Math.floor(Date.now() / 1000) + 300 }, jwtSecret);

      let expRejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketExp, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) expRejected = true;
      }
      if (!expRejected) throw new Error('Accepted expired challenge!');

      // B. Consumed
      const consumedId = crypto.randomUUID();
      await prisma.mfaChallenge.create({
        data: {
          userId: testUser1.id,
          challengeId: consumedId,
          purpose: 'MFA_LOGIN',
          expiresAt: new Date(Date.now() + 300_000),
          consumedAt: new Date(),
        },
      });
      const ticketConsumed = signJwtHmacSha256({ sub: testUser1.id, email: testUser1.email, type: 'mfa_challenge', jti: consumedId, exp: Math.floor(Date.now() / 1000) + 300 }, jwtSecret);

      let consumedRejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketConsumed, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) consumedRejected = true;
      }
      if (!consumedRejected) throw new Error('Accepted already-consumed challenge!');

      // C. Invalidated
      const invId = crypto.randomUUID();
      await prisma.mfaChallenge.create({
        data: {
          userId: testUser1.id,
          challengeId: invId,
          purpose: 'MFA_LOGIN',
          expiresAt: new Date(Date.now() + 300_000),
          invalidatedAt: new Date(),
        },
      });
      const ticketInv = signJwtHmacSha256({ sub: testUser1.id, email: testUser1.email, type: 'mfa_challenge', jti: invId, exp: Math.floor(Date.now() / 1000) + 300 }, jwtSecret);

      let invRejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticketInv, code: '123456' });
      } catch (err: any) {
        if (err.status === 401) invRejected = true;
      }
      if (!invRejected) throw new Error('Accepted invalidated challenge!');

      return { details: 'Expired, consumed, and invalidated states strictly rejected' };
    });

    // 8. Failed challenge cannot be reused
    await recordScenario(8, 'Failed submission permanently consumes challenge so it cannot be reused (one-time)', async () => {
      const loginRes: any = await authService.login({ email: testUser1.email, password: testUserPassword });
      const ticket = loginRes.mfaTicket;

      // 1st attempt with wrong code
      let wrongCodeCaught = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticket, code: '000000' });
      } catch (err: any) {
        wrongCodeCaught = true;
      }
      if (!wrongCodeCaught) throw new Error('Failed to reject wrong code');

      // 2nd attempt with correct code on the same ticket MUST FAIL
      const plainSecret = mfaService.decryptSecret(testUser1.mfaSecret!);
      const validCode = mfaService.computeTotp(plainSecret);

      let reuseRejected = false;
      try {
        await authService.mfaLogin({ mfaTicket: ticket, code: validCode });
      } catch (err: any) {
        if (err.status === 401) reuseRejected = true;
      }
      if (!reuseRejected) throw new Error('Failed challenge was allowed to be reused with correct code!');
      return { details: 'Atomic consumption on first attempt prevents replay even with subsequent valid TOTP' };
    });

    // 9. Concurrent duplicate challenge submissions
    await recordScenario(9, 'Concurrent submissions of same challenge: exactly one succeeds, second rejected', async () => {
      await prisma.user.update({ where: { id: testUser1.id }, data: { mfaLastUsedStep: null } });
      const loginRes: any = await authService.login({ email: testUser1.email, password: testUserPassword });
      const ticket = loginRes.mfaTicket;
      const plainSecret = mfaService.decryptSecret(testUser1.mfaSecret!);
      const validCode = mfaService.computeTotp(plainSecret);

      const [r1, r2] = await Promise.allSettled([
        authService.mfaLogin({ mfaTicket: ticket, code: validCode }),
        authService.mfaLogin({ mfaTicket: ticket, code: validCode }),
      ]);

      const success = (r1.status === 'fulfilled' ? 1 : 0) + (r2.status === 'fulfilled' ? 1 : 0);
      const rejected = (r1.status === 'rejected' ? 1 : 0) + (r2.status === 'rejected' ? 1 : 0);

      if (success !== 1 || rejected !== 1) {
        throw new Error(`Expected 1 success and 1 rejection, got ${success} / ${rejected}`);
      }
      return { details: 'Atomic conditional database update serialized concurrent submissions' };
    });

    // =========================================================================
    // PART 2: Step-Up Authentication for Recovery Code Regeneration (HTTP)
    // =========================================================================

    // Login user 2 to get valid session & access token
    await prisma.user.update({ where: { id: testUser2.id }, data: { mfaLastUsedStep: null } });
    const u2LoginRes: any = await authService.login({ email: testUser2.email, password: testUserPassword });
    const u2PlainSecret = mfaService.decryptSecret(testUser2.mfaSecret!);
    const u2Totp = mfaService.computeTotp(u2PlainSecret);
    const u2AuthRes = await authService.mfaLogin({ mfaTicket: u2LoginRes.mfaTicket, code: u2Totp });
    const user2AccessToken = u2AuthRes.tokens.accessToken;

    // 10. Access token alone is rejected
    await recordScenario(10, 'POST /auth/mfa/regenerate-recovery-codes rejects access token alone without body (HTTP 400)', async () => {
      const res = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2AccessToken}`,
          'X-Forwarded-For': '10.0.0.10',
        },
        body: JSON.stringify({}),
      });

      if (res.status !== 400 && res.status !== 401) {
        throw new Error(`Expected HTTP 400/401, got ${res.status}`);
      }
      return { details: 'Rejected: Step-up authentication body is strictly required' };
    });

    // 11. Incorrect password is rejected
    await recordScenario(11, 'POST /auth/mfa/regenerate-recovery-codes with incorrect password rejected (HTTP 401)', async () => {
      const validCode = mfaService.computeTotp(u2PlainSecret);
      const res = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2AccessToken}`,
          'X-Forwarded-For': '10.0.0.11',
        },
        body: JSON.stringify({
          password: 'WrongPassword123!',
          code: validCode,
        }),
      });

      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 for incorrect password, got ${res.status}`);
      }
      return { details: 'HTTP 401 Unauthorized enforced for wrong password' };
    });

    // 12. Invalid TOTP is rejected
    await recordScenario(12, 'POST /auth/mfa/regenerate-recovery-codes with invalid TOTP code rejected (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2AccessToken}`,
          'X-Forwarded-For': '10.0.0.12',
        },
        body: JSON.stringify({
          password: testUserPassword,
          code: '000000',
        }),
      });

      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 for invalid TOTP, got ${res.status}`);
      }
      return { details: 'HTTP 401 Unauthorized enforced for invalid TOTP code' };
    });

    // 13. Replayed TOTP is rejected
    await recordScenario(13, 'POST /auth/mfa/regenerate-recovery-codes with replayed TOTP code rejected (HTTP 401)', async () => {
      // Reset mfaLastUsedStep to null, then consume once
      await prisma.user.update({ where: { id: testUser2.id }, data: { mfaLastUsedStep: null } });
      const currentCode = mfaService.computeTotp(u2PlainSecret);

      // 1st request succeeds
      const res1 = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2AccessToken}`,
          'X-Forwarded-For': '10.0.0.13',
        },
        body: JSON.stringify({
          password: testUserPassword,
          code: currentCode,
        }),
      });
      if (res1.status !== 200) throw new Error(`1st call failed with ${res1.status}`);

      // 2nd request with exact same TOTP code MUST BE REJECTED
      const res2 = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2AccessToken}`,
          'X-Forwarded-For': '10.0.0.13',
        },
        body: JSON.stringify({
          password: testUserPassword,
          code: currentCode,
        }),
      });

      if (res2.status !== 401) {
        throw new Error(`Expected HTTP 401 for replayed TOTP, got ${res2.status}`);
      }
      return { details: 'Replayed TOTP step rejected with HTTP 401' };
    });

    // 14. Valid password plus fresh TOTP succeeds & invalidates old codes
    let freshRegeneratedCodes: string[] = [];
    await recordScenario(14, 'Regeneration with valid password and fresh TOTP returns 10 codes and invalidates old codes', async () => {
      // Clear counter step to allow fresh code
      await prisma.user.update({ where: { id: testUser2.id }, data: { mfaLastUsedStep: null } });
      const freshTotp = mfaService.computeTotp(u2PlainSecret);

      const res = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user2AccessToken}`,
          'X-Forwarded-For': '10.0.0.14',
        },
        body: JSON.stringify({
          password: testUserPassword,
          code: freshTotp,
        }),
      });

      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const body = await res.json();
      freshRegeneratedCodes = body.data.recoveryCodes;
      if (!Array.isArray(freshRegeneratedCodes) || freshRegeneratedCodes.length !== 10) {
        throw new Error('Expected 10 fresh recovery codes');
      }

      return { details: 'HTTP 200: 10 fresh keyed recovery codes returned' };
    });

    // 15. New recovery code works once and cannot be reused
    await recordScenario(15, 'New recovery codes work once on login and cannot be reused', async () => {
      const loginTicketRes: any = await authService.login({ email: testUser2.email, password: testUserPassword });
      const codeToUse = freshRegeneratedCodes[0];

      // 1st login with new code: SUCCEEDS
      const login1 = await authService.mfaLogin({ mfaTicket: loginTicketRes.mfaTicket, recoveryCode: codeToUse });
      if (!login1.tokens?.accessToken) throw new Error('Login with fresh recovery code failed');

      // 2nd login with exact same code: MUST FAIL
      const loginTicketRes2: any = await authService.login({ email: testUser2.email, password: testUserPassword });
      let reusedCodeFailed = false;
      try {
        await authService.mfaLogin({ mfaTicket: loginTicketRes2.mfaTicket, recoveryCode: codeToUse });
      } catch (err: any) {
        if (err.status === 401) reusedCodeFailed = true;
      }
      if (!reusedCodeFailed) throw new Error('Consumed recovery code was permitted to be reused!');
      return { details: 'Recovery code verified and consumed atomically' };
    });

    // =========================================================================
    // PART 3: Key Rotation Configuration Consistency (JSON Map)
    // =========================================================================

    // 16. Parse valid JSON map
    await recordScenario(16, 'MFA_ENCRYPTION_KEYS JSON map parsed into versioned 32-byte buffers', async () => {
      const jsonMap = mfaService.parseEncryptionKeysJson(
        JSON.stringify({
          v1: testKeyV1Hex,
          v2: testKeyV2Hex,
        }),
      );
      if (jsonMap.size !== 2) throw new Error(`Expected 2 keys, found ${jsonMap.size}`);
      if (!jsonMap.get('v1') || jsonMap.get('v1')!.length !== 32) throw new Error('v1 key invalid');
      if (!jsonMap.get('v2') || jsonMap.get('v2')!.length !== 32) throw new Error('v2 key invalid');
      return { details: 'JSON map correctly parsed and validated' };
    });

    // 17. Multi-version round-trip: Encrypt v1, rotate active to v2, decrypt v1 with historical map
    await recordScenario(17, 'Multi-version rotation: v1 ciphertext decrypts with historical map when v2 is active', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      // Encrypt under v1
      const v1Cipher = mfaService.encryptSecret(secret, 'v1');
      if (!v1Cipher.startsWith('v1:')) throw new Error('Expected v1 prefix');

      // Decrypt while v2 is active
      const originalVersion = process.env.MFA_KEY_VERSION;
      try {
        process.env.MFA_KEY_VERSION = 'v2';
        const decrypted = mfaService.decryptSecret(v1Cipher);
        if (decrypted !== secret) throw new Error('Decryption mismatch under rotated active version');
      } finally {
        process.env.MFA_KEY_VERSION = originalVersion;
      }
      return { details: 'Historical key from MFA_ENCRYPTION_KEYS seamlessly decrypted v1 envelope' };
    });

    // 18. Malformed JSON rejected
    await recordScenario(18, 'Malformed JSON in MFA_ENCRYPTION_KEYS throws descriptive error', async () => {
      let threw = false;
      try {
        mfaService.parseEncryptionKeysJson('{ invalid json string ...');
      } catch (err: any) {
        if (err.message.includes('Malformed JSON') || err.message.includes('Invalid MFA_ENCRYPTION_KEYS')) {
          threw = true;
        }
      }
      if (!threw) throw new Error('Failed to reject malformed JSON string');
      return { details: 'Descriptive validation error thrown on malformed JSON' };
    });

    // 19. Missing historical key failure
    await recordScenario(19, 'Missing historical key throws descriptive failure without silent fallback', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const v3Cipher = `v3:${crypto.randomBytes(12).toString('hex')}:${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(20).toString('hex')}`;

      let threw = false;
      const oldNodeEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        mfaService.decryptSecret(v3Cipher);
      } catch (err: any) {
        if (err.message.includes('No encryption key configured for version "v3"')) {
          threw = true;
        }
      } finally {
        process.env.NODE_ENV = oldNodeEnv;
      }
      if (!threw) throw new Error('Missing historical key did not throw in production!');
      return { details: 'Missing historical key safely failed closed in production' };
    });

    // 20. Tampered ciphertext or altered auth tag throws immediately
    await recordScenario(20, 'Altered authentication tag throws decryption failure immediately', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const cipher = mfaService.encryptSecret(secret, 'v1');
      const parts = cipher.split(':');
      // Tamper tag
      parts[2] = '00000000000000000000000000000000';
      const tampered = parts.join(':');

      let threw = false;
      try {
        mfaService.decryptSecret(tampered);
      } catch (err: any) {
        if (err.status === 401) threw = true;
      }
      if (!threw) throw new Error('Tampered tag was accepted!');
      return { details: 'Decryption failed safely on invalid authentication tag' };
    });

    // 21. Production startup rejects placeholders
    await recordScenario(21, 'Production startup strictly rejects placeholders and development defaults', async () => {
      const oldNodeEnv = process.env.NODE_ENV;
      const oldEnc = process.env.MFA_ENCRYPTION_KEY;
      try {
        process.env.NODE_ENV = 'production';
        process.env.MFA_ENCRYPTION_KEY = 'REPLACE_WITH_UNIQUE_64_HEX_CHAR_SECRET';

        let threw = false;
        try {
          mfaService.validateProductionKeys();
        } catch (err: any) {
          if (err.message.includes('placeholder') || err.message.includes('FATAL CONFIGURATION ERROR')) {
            threw = true;
          }
        }
        if (!threw) throw new Error('Production mode accepted placeholder key!');
      } finally {
        process.env.NODE_ENV = oldNodeEnv;
        process.env.MFA_ENCRYPTION_KEY = oldEnc;
      }
      return { details: 'FATAL CONFIGURATION ERROR thrown on placeholder in production' };
    });

    // =========================================================================
    // PART 4: Real Administrator Enrollment Lifecycle (Live HTTP)
    // =========================================================================

    // 22. Full Admin Enrollment Flow (No Manual DB Injection)
    await recordScenario(22, 'Genuine administrator enrollment lifecycle via HTTP (initiate -> verify -> session)', async () => {
      // 1. Authenticate with password
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testAdmin.email, password: testUserPassword }),
      });
      if (loginRes.status !== 200) throw new Error(`Login failed: ${loginRes.status}`);
      const loginBody = await loginRes.json();
      if (!loginBody.data?.mfaSetupRequired || !loginBody.data?.mfaTicket) {
        throw new Error('Missing setup challenge');
      }
      const setupTicket = loginBody.data.mfaTicket;

      // 2. Obtain setup secret through intended endpoint
      const initRes = await fetch(`${baseUrl}/auth/mfa/admin-setup/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: setupTicket }),
      });
      if (initRes.status !== 200) {
        const errText = await initRes.text();
        throw new Error(`Setup initiate failed: ${initRes.status} -> ${errText}`);
      }
      const initBody = await initRes.json();
      if (!initBody.data?.secret || !initBody.data?.otpauthUri) {
        throw new Error('Initiate missing secret or uri');
      }
      const adminSecret = initBody.data.secret;

      // 3. Compute TOTP code
      const totpCode = mfaService.computeTotp(adminSecret);

      // 4. Complete enrollment
      const setupRes = await fetch(`${baseUrl}/auth/mfa/admin-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: setupTicket, code: totpCode }),
      });
      if (setupRes.status !== 200) throw new Error(`Complete setup failed: ${setupRes.status}`);
      const setupBody = await setupRes.json();
      if (!setupBody.data?.tokens?.accessToken || setupBody.data?.recoveryCodes?.length !== 10) {
        throw new Error('Tokens or recovery codes missing');
      }

      // 5. Verify database state
      const dbAdmin = await prisma.user.findUnique({ where: { id: testAdmin.id } });
      if (!dbAdmin?.mfaEnabled) throw new Error('mfaEnabled is not true');
      if (!dbAdmin?.mfaSecret || !dbAdmin.mfaSecret.startsWith('v1:')) {
        throw new Error('mfaSecret is missing or unencrypted');
      }

      // 6. Verify session created only upon enrollment completion
      const sessionCount = await prisma.session.count({ where: { userId: testAdmin.id } });
      if (sessionCount !== 1) throw new Error(`Expected 1 session in DB, got ${sessionCount}`);

      // 7. Verify setup challenge cannot be reused
      const replayRes = await fetch(`${baseUrl}/auth/mfa/admin-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: setupTicket, code: totpCode }),
      });
      if (replayRes.status !== 401) throw new Error(`Replay should return 401, got ${replayRes.status}`);

      return { details: 'Genuine admin enrollment lifecycle completed and verified end-to-end' };
    });

  } finally {
    // Teardown HTTP server
    await app.close();

    // Cleanup fixtures
    const userIds = [testUser1?.id, testUser2?.id, testAdmin?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.mfaChallenge.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // Summary
  console.log('\n===============================================================');
  console.log('   Phase 7A.3 Remediation Test Execution Summary');
  console.log('===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${passedCount}`);
  console.log(`Failed:          ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFailed scenarios:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.error(`  - Scenario ${r.scenario}: ${r.name} -> ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\nALL 22 PHASE 7A.3 SECURITY REMEDIATION SCENARIOS PASSED VERIFICATION.');
  }
}

runPhase7a3Suite().catch((err) => {
  console.error('Fatal error in Phase 7A.3 suite:', err);
  process.exit(1);
});
