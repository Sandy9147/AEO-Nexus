/**
 * AEO Nexus — Phase 7A.2 Real HTTP Integration Test Suite
 * Live NestJS HTTP Routes, Guards, Controllers, Middleware & Database Execution
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
class HttpIntegrationTestModule {}

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

async function runPhase7a2HttpIntegrationSuite() {
  console.log('\n===============================================================');
  console.log('   AEO Nexus — Phase 7A.2 Real HTTP Integration Test Suite');
  console.log('   Live HTTP Routes, Guards, Middleware & Session Management');
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

  // Resilient connect with retries
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

  // Bootstrap real NestJS HTTP Server
  const app: INestApplication = await NestFactory.create(HttpIntegrationTestModule, {
    logger: false,
  });

  // Attach real OWASP security headers & body parsers identical to main.ts
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Listen on ephemeral random port
  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4000;
  const baseUrl = `http://127.0.0.1:${port}`;

  const mfaService = app.get(MfaService);
  const testRunId = `http7a2_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  let testAdminUser: any = null;
  const adminPassword = 'AdminPasswordHttp123!@#';
  let adminPlainSecret = '';
  let adminSetupTicket = '';
  let adminAccessToken = '';
  let adminRecoveryCodes: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // 1. POST /auth/login - Admin Password Challenge
    // -------------------------------------------------------------------------
    await recordScenario(1, 'POST /auth/login returns MFA setup challenge and creates 0 sessions in DB', async () => {
      const email = `admin-http-${testRunId}@aeonexus.security`;
      const pwdHash = await bcrypt.hash(adminPassword, 10);
      testAdminUser = await prisma.user.create({
        data: {
          email,
          passwordHash: pwdHash,
          firstName: 'Admin',
          lastName: 'Http',
          platformRole: PlatformRole.PLATFORM_ADMIN,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false,
        },
      });

      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: adminPassword }),
      });

      if (res.status !== 200) {
        throw new Error(`Expected HTTP 200, got ${res.status}: ${await res.text()}`);
      }

      const body = await res.json();
      if (!body.data?.mfaRequired || !body.data?.mfaSetupRequired || !body.data?.mfaTicket) {
        throw new Error(`Response missing mfaTicket or setup flags: ${JSON.stringify(body)}`);
      }
      adminSetupTicket = body.data.mfaTicket;

      // Ensure 0 sessions created in database
      const sessions = await prisma.session.count({ where: { userId: testAdminUser.id } });
      if (sessions !== 0) throw new Error(`Expected 0 sessions, found ${sessions}`);

      // Verify challenge created in mfa_challenges
      const challengeCount = await prisma.mfaChallenge.count({
        where: { userId: testAdminUser.id, purpose: 'MFA_SETUP' },
      });
      if (challengeCount !== 1) throw new Error(`Expected 1 persisted challenge, found ${challengeCount}`);

      return { details: `HTTP 200, challenge ticket issued, 0 sessions in database` };
    });

    // -------------------------------------------------------------------------
    // 2. GET /auth/me with Challenge Token Blocked by JwtAuthGuard
    // -------------------------------------------------------------------------
    await recordScenario(2, 'GET /auth/me with challenge token strictly rejected with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminSetupTicket}`,
        },
      });

      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401, got ${res.status}: ${await res.text()}`);
      }

      return { details: 'JwtAuthGuard blocked challenge token on protected resource endpoint' };
    });

    // -------------------------------------------------------------------------
    // 3. POST /auth/mfa/admin-setup - Live Enrollment
    // -------------------------------------------------------------------------
    await recordScenario(3, 'POST /auth/mfa/admin-setup verifies TOTP, returns tokens, and sets refresh cookie', async () => {
      adminPlainSecret = mfaService.generateSecret();
      await prisma.user.update({
        where: { id: testAdminUser.id },
        data: { mfaSecret: mfaService.encryptSecret(adminPlainSecret) },
      });

      const validCode = mfaService.computeTotp(adminPlainSecret);

      const res = await fetch(`${baseUrl}/auth/mfa/admin-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: adminSetupTicket,
          code: validCode,
        }),
      });

      if (res.status !== 200) {
        throw new Error(`Expected HTTP 200, got ${res.status}: ${await res.text()}`);
      }

      const body = await res.json();
      if (!body.data?.tokens?.accessToken || !body.data?.recoveryCodes) {
        throw new Error(`Response missing tokens or recoveryCodes: ${JSON.stringify(body)}`);
      }

      adminAccessToken = body.data.tokens.accessToken;
      adminRecoveryCodes = body.data.recoveryCodes;
      if (adminRecoveryCodes.length !== 10) throw new Error('Expected 10 recovery codes');

      // Verify Set-Cookie header contains refreshToken
      const cookieHeader = res.headers.get('set-cookie');
      if (!cookieHeader || (!cookieHeader.includes('aeo_nexus_refresh_token=') && !cookieHeader.includes('refreshToken='))) {
        throw new Error(`Set-Cookie header missing refreshToken: ${cookieHeader}`);
      }

      return { details: 'HTTP 200, access token issued, 10 recovery codes returned, refresh cookie set' };
    });

    // -------------------------------------------------------------------------
    // 4. Replaying Consumed Setup Challenge
    // -------------------------------------------------------------------------
    await recordScenario(4, 'POST /auth/mfa/admin-setup replaying consumed ticket returns HTTP 401', async () => {
      const code = mfaService.computeTotp(adminPlainSecret);
      const res = await fetch(`${baseUrl}/auth/mfa/admin-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: adminSetupTicket,
          code,
        }),
      });

      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 for consumed ticket, got ${res.status}: ${await res.text()}`);
      }

      return { details: 'Consumed setup challenge rejected with HTTP 401' };
    });

    // -------------------------------------------------------------------------
    // 5. POST /auth/login for Enrolled User -> Regular MFA Challenge
    // -------------------------------------------------------------------------
    let loginTicket = '';
    await recordScenario(5, 'POST /auth/login for enrolled user yields regular mfa_challenge ticket', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdminUser.email,
          password: adminPassword,
        }),
      });

      if (res.status !== 200) throw new Error(`Expected HTTP 200, got ${res.status}`);
      const body = await res.json();
      if (!body.data?.mfaRequired || body.data?.mfaSetupRequired || !body.data?.mfaTicket) {
        throw new Error(`Expected regular mfa challenge: ${JSON.stringify(body)}`);
      }
      loginTicket = body.data.mfaTicket;

      return { details: 'HTTP 200, regular MFA login challenge issued' };
    });

    // -------------------------------------------------------------------------
    // 6. POST /auth/mfa/login with Valid TOTP
    // -------------------------------------------------------------------------
    await recordScenario(6, 'POST /auth/mfa/login with valid TOTP code succeeds and establishes session', async () => {
      // Reset mfaLastUsedStep to avoid step conflict from enrollment
      await prisma.user.update({
        where: { id: testAdminUser.id },
        data: { mfaLastUsedStep: null },
      });
      const validCode = mfaService.computeTotp(adminPlainSecret);

      const res = await fetch(`${baseUrl}/auth/mfa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaTicket: loginTicket,
          code: validCode,
        }),
      });

      if (res.status !== 200) {
        throw new Error(`Expected HTTP 200, got ${res.status}: ${await res.text()}`);
      }

      const body = await res.json();
      if (!body.data?.tokens?.accessToken) throw new Error('Missing accessToken');

      return { details: 'HTTP 200, session established with valid TOTP code' };
    });

    // -------------------------------------------------------------------------
    // 7. POST /auth/mfa/login Replaying Consumed Login Ticket
    // -------------------------------------------------------------------------
    await recordScenario(7, 'POST /auth/mfa/login replaying consumed ticket returns HTTP 401', async () => {
      const code = mfaService.computeTotp(adminPlainSecret, Date.now() + 90_000);
      const res = await fetch(`${baseUrl}/auth/mfa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaTicket: loginTicket,
          code,
        }),
      });

      if (res.status !== 401) {
        throw new Error(`Expected HTTP 401 for consumed login ticket, got ${res.status}: ${await res.text()}`);
      }

      return { details: 'Consumed login challenge rejected with HTTP 401' };
    });

    // -------------------------------------------------------------------------
    // 8. POST /auth/mfa/login with Recovery Code
    // -------------------------------------------------------------------------
    await recordScenario(8, 'POST /auth/mfa/login with recovery code succeeds and decrements remaining codes', async () => {
      // Get fresh login ticket
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdminUser.email,
          password: adminPassword,
        }),
      });
      const loginBody = await loginRes.json();
      const freshTicket = loginBody.data.mfaTicket;

      const codeToUse = adminRecoveryCodes[0];
      const res = await fetch(`${baseUrl}/auth/mfa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaTicket: freshTicket,
          recoveryCode: codeToUse,
        }),
      });

      if (res.status !== 200) {
        throw new Error(`Expected HTTP 200, got ${res.status}: ${await res.text()}`);
      }

      // Verify in DB that code count decremented to 9
      const user = await prisma.user.findUnique({ where: { id: testAdminUser.id } });
      if (user?.mfaRecoveryCodes?.length !== 9) {
        throw new Error(`Expected 9 recovery codes remaining in DB, found ${user?.mfaRecoveryCodes?.length}`);
      }

      return { details: 'HTTP 200, recovery code accepted and decremented to 9' };
    });

    // -------------------------------------------------------------------------
    // 9. POST /auth/mfa/disable Forbidden for Administrative Role
    // -------------------------------------------------------------------------
    await recordScenario(9, 'POST /auth/mfa/disable returns HTTP 400 when invoked on administrative account', async () => {
      const res = await fetch(`${baseUrl}/auth/mfa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({
          password: adminPassword,
          code: mfaService.computeTotp(adminPlainSecret),
        }),
      });

      if (res.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${res.status}: ${await res.text()}`);
      }

      const body = await res.json();
      if (!body.message?.includes('mandatory for administrative accounts')) {
        throw new Error(`Expected administrative restriction error message, got: ${JSON.stringify(body)}`);
      }

      return { details: 'HTTP 400 Bad Request enforced for admin MFA disable attempt' };
    });

    // -------------------------------------------------------------------------
    // 10. POST /auth/mfa/regenerate-recovery-codes
    // -------------------------------------------------------------------------
    await recordScenario(10, 'POST /auth/mfa/regenerate-recovery-codes returns 10 fresh codes over HTTP', async () => {
      const res = await fetch(`${baseUrl}/auth/mfa/regenerate-recovery-codes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
        },
      });

      if (res.status !== 200) {
        throw new Error(`Expected HTTP 200, got ${res.status}: ${await res.text()}`);
      }

      const body = await res.json();
      if (!Array.isArray(body.data?.recoveryCodes) || body.data.recoveryCodes.length !== 10) {
        throw new Error(`Expected 10 recovery codes: ${JSON.stringify(body)}`);
      }

      const user = await prisma.user.findUnique({ where: { id: testAdminUser.id } });
      if (user?.mfaRecoveryCodes?.length !== 10) {
        throw new Error('Database record was not updated with 10 recovery codes');
      }

      return { details: 'HTTP 200, 10 fresh recovery codes returned and persisted' };
    });

    // -------------------------------------------------------------------------
    // 11. Malformed Payloads & Missing Input Handling
    // -------------------------------------------------------------------------
    await recordScenario(11, 'POST /auth/mfa/login with missing code or invalid payload returns HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/auth/mfa/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mfaTicket: 'invalid.jwt.ticket',
        }),
      });

      if (res.status !== 401 && res.status !== 400) {
        throw new Error(`Expected HTTP 400 or 401 for malformed payload, got ${res.status}`);
      }

      return { details: 'Malformed requests rejected cleanly with appropriate error status' };
    });

  } finally {
    // Teardown NestJS server
    await app.close();

    // Clean up test data
    if (testAdminUser?.id) {
      await prisma.mfaChallenge.deleteMany({ where: { userId: testAdminUser.id } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: testAdminUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testAdminUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Summary Reporting
  // ---------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('   Phase 7A.2 Real HTTP Integration Test Execution Summary');
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
    console.log('\nALL 11 REAL HTTP INTEGRATION SCENARIOS PASSED VERIFICATION.');
  }
}

runPhase7a2HttpIntegrationSuite().catch((err) => {
  console.error('Fatal execution error in Phase 7A.2 HTTP suite:', err);
  process.exit(1);
});
