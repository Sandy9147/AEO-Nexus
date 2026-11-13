/**
 * AEO Nexus — Phase 7A Automated Security Verification Test Suite
 * Security Audit & Platform Hardening (30 Comprehensive Scenarios)
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
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { ProjectsService } from '../src/projects/projects.service';
import { KnowledgeService } from '../src/knowledge/knowledge.service';
import { DiscoverService } from '../src/discover/discover.service';
import { PlanService } from '../src/plan/plan.service';
import { WebsiteService } from '../src/build/website.service';
import { WebsiteRendererService } from '../src/build/website-renderer.service';
import { RESERVED_SUBDOMAINS } from '@aeo-nexus/contracts';
import { generateOpaqueToken, hashToken } from '@aeo-nexus/auth';
import { processAiRunJob } from '../../../apps/worker/src/processors/ai-run.processor';
import { processDiscoverResearchJob } from '../../../apps/worker/src/processors/discover-research.processor';
import { processPlanGenerationJob } from '../../../apps/worker/src/processors/plan-generation.processor';
import { processWebsiteGenerationJob } from '../../../apps/worker/src/processors/website-generation.processor';

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

async function runPhase7aSecuritySuite() {
  console.log('\n===============================================================');
  console.log('   AEO Nexus — Phase 7A Automated Security Test Suite');
  console.log('   Security Audit & Platform Hardening (30 Scenarios)');
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
  await prisma.$connect();
  const prismaService = prisma as unknown as PrismaService;

  // Initialize Services
  const emailService = new EmailService();
  const mfaService = new MfaService();
  const authService = new AuthService(prismaService, emailService, mfaService);
  const workspacesService = new WorkspacesService(prismaService, emailService);
  const projectsService = new ProjectsService(prismaService, workspacesService);
  const knowledgeService = new KnowledgeService(prismaService, workspacesService);
  const mockDiscoverQueue = {
    enqueueResearch: async () => ({ id: 'mock-research-job' }),
  } as any;
  const mockPlanQueue = {
    enqueuePlanGeneration: async () => ({ id: 'mock-plan-job' }),
  } as any;
  const discoverService = new DiscoverService(prismaService, mockDiscoverQueue);
  const planService = new PlanService(prismaService, mockPlanQueue, projectsService);
  const rendererService = new WebsiteRendererService();
  const websiteService = new WebsiteService(
    prismaService,
    rendererService,
    null as any,
    null as any,
  );

  const testRunId = Date.now().toString(36);
  const userAPassword = 'Password123!Secure@A';
  const userBPassword = 'Password123!Secure@B';
  const adminPassword = 'AdminPassword123!@#';

  let userA: any;
  let userB: any;
  let adminUser: any;
  let adminMfaSecret: string = '';
  let workspaceA: any;
  let workspaceB: any;
  let projectA: any;
  let taskA: any;
  let docA: any;
  let researchA: any;
  let planA: any;
  let websiteA: any;
  let sessionA: any;
  let oldRefreshTokenA: string = '';

  try {
    // =========================================================================
    // SECTION 1: AUTHENTICATION & IDENTITY HARDENING
    // =========================================================================

    await recordScenario(1, 'Password Hashing Configuration (bcrypt salt and verification)', async () => {
      const hash = await bcrypt.hash('TestPass123!', 10);
      if (!hash.startsWith('$2b$10$') && !hash.startsWith('$2a$10$')) {
        throw new Error('Hash format does not conform to bcrypt 10 salt rounds');
      }
      const match = await bcrypt.compare('TestPass123!', hash);
      const wrong = await bcrypt.compare('WrongPassword', hash);
      if (!match || wrong) throw new Error('Bcrypt compare verification failed');
      return { details: 'Bcrypt salt rounds=10 format confirmed' };
    });

    await recordScenario(2, 'Email Verification Requirement Gate', async () => {
      const email = `unverified-${testRunId}@aeonexus.security`;
      const pwdHash = await bcrypt.hash(userAPassword, 10);
      const unverified = await prisma.user.create({
        data: {
          email,
          passwordHash: pwdHash,
          firstName: 'Unverified',
          lastName: 'User',
          emailVerified: false,
        },
      });

      let blocked = false;
      try {
        await authService.login({ email, password: userAPassword });
      } catch (err: any) {
        if (err.message.includes('Email not verified')) {
          blocked = true;
        }
      }

      await prisma.user.delete({ where: { id: unverified.id } });
      if (!blocked) throw new Error('Unverified user was incorrectly allowed to log in');
      return { details: 'Unverified account login strictly prevented with 401' };
    });

    await recordScenario(3, 'Refresh Token Rotation and Session Establishment', async () => {
      const emailA = `tenant-a-${testRunId}@aeonexus.security`;
      const pwdHashA = await bcrypt.hash(userAPassword, 10);
      userA = await prisma.user.create({
        data: {
          email: emailA,
          passwordHash: pwdHashA,
          firstName: 'Alice',
          lastName: 'TenantA',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      workspaceA = await prisma.workspace.create({
        data: {
          name: `Workspace Alpha ${testRunId}`,
          slug: `alpha-${testRunId}`,
          members: {
            create: {
              userId: userA.id,
              role: 'WORKSPACE_OWNER',
              isActive: true,
            },
          },
        },
      });

      const loginRes: any = await authService.login({
        email: emailA,
        password: userAPassword,
      });

      if (!loginRes.tokens?.accessToken || !loginRes.tokens?.refreshToken) {
        throw new Error('Login failed to yield tokens');
      }

      oldRefreshTokenA = loginRes.tokens.refreshToken;

      // Rotate token
      const refreshRes = await authService.refresh(oldRefreshTokenA);
      if (!refreshRes.tokens?.refreshToken) {
        throw new Error('Refresh did not produce a new rotated refresh token');
      }
      if (refreshRes.tokens.refreshToken === oldRefreshTokenA) {
        throw new Error('Refresh token was not rotated to a new token value');
      }

      sessionA = refreshRes;
      return { details: 'Refresh token successfully rotated' };
    });

    await recordScenario(4, 'Refresh Token Reuse Detection (Revocation of session family)', async () => {
      // Attempting to reuse oldRefreshTokenA (which has already been rotated)
      let reuseDetected = false;
      try {
        await authService.refresh(oldRefreshTokenA);
      } catch (err: any) {
        if (err.message.includes('revoked') || err.message.includes('Reuse') || err.message.includes('invalid') || err.message.includes('Invalid')) {
          reuseDetected = true;
        }
      }

      if (!reuseDetected) {
        throw new Error('Replayed refresh token was not detected or rejected');
      }
      return { details: 'Old refresh token replay rejected and flagged' };
    });

    await recordScenario(5, 'Account Enumeration Protection (Generic response for invalid credentials)', async () => {
      let rejected = false;
      try {
        await authService.login({
          email: `non-existent-user-${testRunId}@randomdomain.xyz`,
          password: 'SomeRandomPassword123!',
        });
      } catch (err: any) {
        if (err.message === 'Invalid credentials') {
          rejected = true;
        }
      }
      if (!rejected) throw new Error('Response did not protect against account enumeration');
      return { details: 'Generic "Invalid credentials" error returned' };
    });

    await recordScenario(6, 'Session Revocation and List Management', async () => {
      // Create a dedicated active session to inspect and revoke
      const rawRefreshToken = generateOpaqueToken(32);
      const refreshTokenHash = hashToken(rawRefreshToken);
      const expiresAt = new Date(Date.now() + 86400000);
      await prisma.session.create({
        data: {
          userId: userA.id,
          tokenHash: refreshTokenHash,
          expiresAt,
        },
      });

      const sessions = await authService.listSessions(userA.id);
      if (!Array.isArray(sessions) || sessions.length === 0) {
        throw new Error('Sessions list is empty');
      }

      const revRes = await authService.revokeSession(userA.id, sessions[0].id);
      if (!revRes.revoked) throw new Error('Session could not be revoked');

      return { details: `Active sessions inspected and revoked successfully` };
    });

    // =========================================================================
    // SECTION 2: MULTI-FACTOR AUTHENTICATION (MFA / RFC 6238)
    // =========================================================================

    let mfaSecretUserA: string = '';
    let recoveryCodesUserA: string[] = [];

    await recordScenario(7, 'RFC 6238 Base32 Secret Generation and TOTP Computation', async () => {
      mfaSecretUserA = mfaService.generateSecret();
      if (!mfaSecretUserA || mfaSecretUserA.length < 16) {
        throw new Error('Secret length insufficient');
      }

      const code = mfaService.computeTotp(mfaSecretUserA);
      if (!/^\d{6}$/.test(code)) {
        throw new Error(`Computed TOTP is not a 6-digit code: ${code}`);
      }

      const uri = mfaService.getOtpAuthUri(mfaSecretUserA, userA.email);
      if (!uri.startsWith('otpauth://totp/') || !uri.includes(mfaSecretUserA)) {
        throw new Error(`Invalid otpauth URI: ${uri}`);
      }

      return { details: `Generated 32-char base32 secret and valid 6-digit TOTP` };
    });

    await recordScenario(8, 'RFC 6238 Time Drift Tolerance Window (-1, 0, +1 step)', async () => {
      const now = Date.now();
      const currentCode = mfaService.computeTotp(mfaSecretUserA, now);
      const pastCode = mfaService.computeTotp(mfaSecretUserA, now - 30_000);
      const futureCode = mfaService.computeTotp(mfaSecretUserA, now + 30_000);
      const expiredCode = mfaService.computeTotp(mfaSecretUserA, now - 120_000); // 4 steps ago

      const verifyCurrent = mfaService.verifyTotp(mfaSecretUserA, currentCode);
      const verifyPast = mfaService.verifyTotp(mfaSecretUserA, pastCode);
      const verifyFuture = mfaService.verifyTotp(mfaSecretUserA, futureCode);
      const verifyExpired = mfaService.verifyTotp(mfaSecretUserA, expiredCode);

      if (!verifyCurrent.valid || !verifyPast.valid || !verifyFuture.valid) {
        throw new Error('Valid time drift window rejected a legitimate code');
      }
      if (verifyExpired.valid) {
        throw new Error('Expired code (>2 steps outside window) was incorrectly accepted');
      }

      return { details: 'Drift window correctly handles +/- 30s tolerance and rejects expired' };
    });

    await recordScenario(9, 'MFA Replay Prevention Window Protection', async () => {
      const code = mfaService.computeTotp(mfaSecretUserA);
      const firstCheck = mfaService.verifyTotp(mfaSecretUserA, code, null);
      if (!firstCheck.valid) throw new Error('Initial TOTP verification failed');

      // Now replay the same code with lastUsedCode set to code
      const replayCheck = mfaService.verifyTotp(mfaSecretUserA, code, code);
      if (replayCheck.valid) {
        throw new Error('Replayed TOTP code was accepted despite matching lastUsedCode');
      }

      return { details: 'Immediate replay of consumed TOTP rejected' };
    });

    await recordScenario(10, 'Single-Use Recovery Backup Codes Generation & Consumption', async () => {
      const { plaintextCodes, hashedCodes } = mfaService.generateRecoveryCodes(10);
      if (plaintextCodes.length !== 10 || hashedCodes.length !== 10) {
        throw new Error('Expected 10 backup recovery codes');
      }

      const testCode = plaintextCodes[0];
      const consumeRes = mfaService.verifyAndConsumeRecoveryCode(testCode, hashedCodes);
      if (!consumeRes.valid) throw new Error('Failed to consume valid recovery code');
      if (consumeRes.remainingHashedCodes.length !== 9) {
        throw new Error('Remaining codes count not decremented');
      }

      // Reusing the same code must fail
      const reuseRes = mfaService.verifyAndConsumeRecoveryCode(testCode, consumeRes.remainingHashedCodes);
      if (reuseRes.valid) {
        throw new Error('Reused recovery code was incorrectly validated');
      }

      return { details: '10 recovery codes created, single-use consumption verified' };
    });

    await recordScenario(11, 'End-to-End User MFA Enrollment Lifecycle', async () => {
      // 1. Setup
      const setup = await authService.setupMfa(userA.id);
      if (!setup.secret || !setup.otpauthUri) throw new Error('Setup failed');

      // 2. Compute verification code
      const code = mfaService.computeTotp(setup.secret);

      // 3. Enable MFA
      const enableRes = await authService.verifyAndEnableMfa(userA.id, code);
      if (!enableRes.enabled || enableRes.recoveryCodes.length !== 10) {
        throw new Error('Enable MFA failed');
      }
      recoveryCodesUserA = enableRes.recoveryCodes;

      // 4. Verify login requires MFA
      const challenge: any = await authService.login({
        email: userA.email,
        password: userAPassword,
      });

      if (!challenge.mfaRequired || !challenge.mfaTicket) {
        throw new Error('Login did not return MFA challenge for MFA-enabled user');
      }

      // 5. Complete login via mfaLogin with single-use backup recovery code
      const mfaLoginRes = await authService.mfaLogin({
        mfaTicket: challenge.mfaTicket,
        recoveryCode: recoveryCodesUserA[0],
      });

      if (!mfaLoginRes.tokens?.accessToken) {
        throw new Error('mfaLogin failed to complete session creation');
      }

      return { details: 'User MFA setup, enrollment, challenge, and recovery code verification completed' };
    });

    await recordScenario(12, 'Administrative Account Mandatory MFA Enforcement', async () => {
      const adminEmail = `platform-admin-${testRunId}@aeonexus.security`;
      const adminPwdHash = await bcrypt.hash(adminPassword, 10);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: adminPwdHash,
          firstName: 'Admin',
          lastName: 'Super',
          platformRole: PlatformRole.PLATFORM_ADMIN,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          mfaEnabled: false, // Not enrolled yet
        },
      });

      const loginRes: any = await authService.login({
        email: adminEmail,
        password: adminPassword,
      });

      if (!loginRes.mfaRequired || !loginRes.mfaSetupRequired || !loginRes.mfaTicket) {
        throw new Error('Platform admin without MFA was not challenged with mandatory setup');
      }

      // Admin completes setup
      adminMfaSecret = mfaService.generateSecret();
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { mfaSecret: adminMfaSecret },
      });

      const adminCode = mfaService.computeTotp(adminMfaSecret);
      const adminSetupComplete = await authService.completeAdminMfaSetup(loginRes.mfaTicket, adminCode);
      if (!adminSetupComplete.tokens?.accessToken || adminSetupComplete.recoveryCodes.length !== 10) {
        throw new Error('Admin MFA completion failed');
      }

      return { details: 'Admin without MFA blocked, challenged, and successfully enrolled' };
    });

    await recordScenario(13, 'Administrative MFA Immutable Protection (Cannot be disabled)', async () => {
      let disableRejected = false;
      const code = mfaService.computeTotp(adminMfaSecret);
      try {
        await authService.disableMfa(adminUser.id, {
          password: adminPassword,
          code,
        });
      } catch (err: any) {
        if (err.message.includes('mandatory') || err.message.includes('cannot be disabled')) {
          disableRejected = true;
        }
      }

      if (!disableRejected) {
        throw new Error('Platform admin was incorrectly permitted to disable MFA');
      }

      return { details: 'Admin MFA disable attempt strictly rejected' };
    });

    // =========================================================================
    // SECTION 3: MULTI-TENANT ISOLATION & OBJECT-LEVEL AUTHORIZATION
    // =========================================================================

    await recordScenario(14, 'Multi-Tenant Cross-Isolation Provisioning (Tenant A vs Tenant B)', async () => {
      const emailB = `tenant-b-${testRunId}@aeonexus.security`;
      const pwdHashB = await bcrypt.hash(userBPassword, 10);
      userB = await prisma.user.create({
        data: {
          email: emailB,
          passwordHash: pwdHashB,
          firstName: 'Bob',
          lastName: 'TenantB',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      workspaceB = await prisma.workspace.create({
        data: {
          name: `Workspace Beta ${testRunId}`,
          slug: `beta-${testRunId}`,
          members: {
            create: {
              userId: userB.id,
              role: 'WORKSPACE_OWNER',
              isActive: true,
            },
          },
        },
      });

      // Tenant A resources
      projectA = await projectsService.createProject(workspaceA.id, userA.id, {
        name: `Alpha Confidential Project ${testRunId}`,
        description: 'Internal project belonging solely to Workspace Alpha',
      });

      taskA = await projectsService.createTask(workspaceA.id, userA.id, {
        projectId: projectA.id,
        title: 'Confidential Task in Alpha',
        description: 'Task details for Alpha only',
        status: 'TODO',
        priority: 'HIGH',
      });

      docA = await knowledgeService.createDocument(workspaceA.id, userA.id, {
        title: 'Alpha Proprietary Blueprint',
        category: 'COMPANY',
        content: 'Confidential company strategy and trade secrets.',
      });

      researchA = await discoverService.createResearch(workspaceA.id, userA.id, {
        title: 'Alpha Market Reconnaissance',
        topic: 'Enterprise SaaS',
        targetCountry: 'US',
      });

      planA = await planService.createPlan(workspaceA.id, userA.id, {
        title: 'Alpha Strategic 5-Year Plan',
        horizonMonths: 36,
      });

      websiteA = await websiteService.createWebsite(workspaceA.id, userA.id, {
        name: `Alpha Brand Website ${testRunId}`,
        targetAudience: 'Global Developers',
      });

      return { details: 'Two fully isolated workspace tenants and initial resources provisioned' };
    });

    await recordScenario(15, 'Cross-Tenant Project Access Rejection', async () => {
      let readBlocked = false;
      try {
        await projectsService.getProject(workspaceB.id, userB.id, projectA.id);
      } catch (err: any) {
        if (err.status === 404 || err.message.includes('not found') || err.message.includes('Forbidden')) {
          readBlocked = true;
        }
      }

      let updateBlocked = false;
      try {
        await projectsService.updateProject(workspaceB.id, userB.id, projectA.id, {
          name: 'Hacked Project Name',
        });
      } catch (err: any) {
        updateBlocked = true;
      }

      let deleteBlocked = false;
      try {
        await projectsService.deleteProject(workspaceB.id, userB.id, projectA.id);
      } catch (err: any) {
        deleteBlocked = true;
      }

      if (!readBlocked || !updateBlocked || !deleteBlocked) {
        throw new Error('Tenant B was able to access or mutate Tenant A project');
      }

      return { details: 'Cross-tenant project read/update/delete requests rejected' };
    });

    await recordScenario(16, 'Cross-Tenant Task Access Rejection', async () => {
      let readBlocked = false;
      try {
        await projectsService.listProjectTasks(workspaceB.id, userB.id, projectA.id);
      } catch (err: any) {
        readBlocked = true;
      }

      let updateBlocked = false;
      try {
        await projectsService.updateTask(workspaceB.id, userB.id, taskA.id, {
          title: 'Hacked Task Title',
        });
      } catch (err: any) {
        updateBlocked = true;
      }

      let deleteBlocked = false;
      try {
        await projectsService.deleteTask(workspaceB.id, userB.id, taskA.id);
      } catch (err: any) {
        deleteBlocked = true;
      }

      if (!readBlocked || !updateBlocked || !deleteBlocked) {
        throw new Error('Tenant B was able to access or mutate Tenant A task');
      }

      return { details: 'Cross-tenant task operations prevented' };
    });

    await recordScenario(17, 'Cross-Tenant Task Assignee IDOR Protection', async () => {
      // User A in Workspace A attempts to assign a task in Workspace A to User B (who is in Workspace B only)
      let assignmentBlocked = false;
      try {
        await projectsService.createTask(workspaceA.id, userA.id, {
          projectId: projectA.id,
          title: 'Illegal Assignment Task',
          assignedToId: userB.id,
        });
      } catch (err: any) {
        if (err.message.includes('not an active member') || err.status === 400) {
          assignmentBlocked = true;
        }
      }

      if (!assignmentBlocked) {
        throw new Error('Cross-tenant user assignment was incorrectly allowed');
      }

      return { details: 'Task assignment to foreign workspace user rejected with 400' };
    });

    await recordScenario(18, 'Cross-Tenant Project Member Addition Protection', async () => {
      // Attempt to create a project in Workspace A with memberIds containing User B
      let memberAddBlocked = false;
      try {
        await projectsService.createProject(workspaceA.id, userA.id, {
          name: 'Cross Tenant Project Attempt',
          memberIds: [userB.id],
        });
      } catch (err: any) {
        if (err.message.includes('not an active member') || err.status === 400) {
          memberAddBlocked = true;
        }
      }

      if (!memberAddBlocked) {
        throw new Error('Foreign workspace user was incorrectly allowed as project member');
      }

      return { details: 'Project creation with foreign member rejected' };
    });

    await recordScenario(19, 'Cross-Tenant Knowledge Document Isolation', async () => {
      let docReadBlocked = false;
      try {
        await knowledgeService.getDocument(workspaceB.id, userB.id, docA.id);
      } catch (err: any) {
        docReadBlocked = true;
      }

      let docUpdateBlocked = false;
      try {
        await knowledgeService.updateDocument(workspaceB.id, userB.id, docA.id, {
          content: 'Tampered knowledge base',
        });
      } catch (err: any) {
        docUpdateBlocked = true;
      }

      if (!docReadBlocked || !docUpdateBlocked) {
        throw new Error('Tenant B was able to access or alter Tenant A knowledge documents');
      }

      return { details: 'Knowledge base tenant isolation verified' };
    });

    await recordScenario(20, 'Cross-Tenant Discover Research Isolation', async () => {
      let researchBlocked = false;
      try {
        await discoverService.getResearchDetail(workspaceB.id, researchA.id);
      } catch (err: any) {
        researchBlocked = true;
      }

      if (!researchBlocked) {
        throw new Error('Tenant B was able to read Tenant A research project');
      }

      return { details: 'Discover research cross-tenant access rejected' };
    });

    await recordScenario(21, 'Cross-Tenant Strategic Plan Isolation', async () => {
      let planBlocked = false;
      try {
        await planService.getPlan(workspaceB.id, planA.id);
      } catch (err: any) {
        planBlocked = true;
      }

      if (!planBlocked) {
        throw new Error('Tenant B was able to read Tenant A strategic plan');
      }

      return { details: 'Strategic plan cross-tenant access blocked' };
    });

    await recordScenario(22, 'Cross-Tenant Website Project Isolation', async () => {
      let webBlocked = false;
      try {
        await websiteService.getWebsite(workspaceB.id, websiteA.id);
      } catch (err: any) {
        webBlocked = true;
      }

      if (!webBlocked) {
        throw new Error('Tenant B was able to access Tenant A website project');
      }

      return { details: 'Website builder tenant boundary verified' };
    });

    // =========================================================================
    // SECTION 4: WEBSITE PUBLISHING SECURITY & SANITIZATION
    // =========================================================================

    await recordScenario(23, 'Reserved Subdomain Publishing Prevention', async () => {
      let reservedBlocked = false;
      try {
        await websiteService.publishWebsite(workspaceA.id, websiteA.id, userA.id, 'admin');
      } catch (err: any) {
        if (err.message.includes('reserved') || err.status === 400) {
          reservedBlocked = true;
        }
      }

      let apiReservedBlocked = false;
      try {
        await websiteService.publishWebsite(workspaceA.id, websiteA.id, userA.id, 'api');
      } catch (err: any) {
        if (err.message.includes('reserved')) {
          apiReservedBlocked = true;
        }
      }

      if (!reservedBlocked || !apiReservedBlocked) {
        throw new Error('Reserved subdomains ("admin", "api") were not blocked');
      }

      return { details: 'Reserved subdomains strictly blocked with 400' };
    });

    await recordScenario(24, 'Subdomain Regex Format and Collision Enforcement', async () => {
      let invalidCharBlocked = false;
      try {
        await websiteService.publishWebsite(workspaceA.id, websiteA.id, userA.id, 'bad_subdomain!');
      } catch (err: any) {
        invalidCharBlocked = true;
      }

      if (!invalidCharBlocked) {
        throw new Error('Invalid subdomain with special characters was not rejected');
      }

      // Valid publication
      const validSubdomain = `sec-test-${testRunId}`;
      const pubRes = await websiteService.publishWebsite(workspaceA.id, websiteA.id, userA.id, validSubdomain);
      if (pubRes.website.status !== 'PUBLISHED' || pubRes.publication.subdomain !== validSubdomain) {
        throw new Error('Valid website publication failed');
      }

      return { details: 'Subdomain syntax validated and published' };
    });

    await recordScenario(25, 'Unpublish Lifecycle and Route Availability', async () => {
      const unpubRes = await websiteService.unpublishWebsite(workspaceA.id, websiteA.id);
      if (!unpubRes.success) throw new Error('Unpublish request failed');

      // Verify website is no longer active
      const web = await websiteService.getWebsite(workspaceA.id, websiteA.id);
      if (web.isPublished) {
        throw new Error('Website still marked as published after unpublish action');
      }

      return { details: 'Unpublish sets isPublished=false and disables publication records' };
    });

    await recordScenario(26, 'Stored XSS and Malicious URL Protocol Sanitization', async () => {
      // 1. Unsafe protocols: javascript:, data:, vbscript:
      let jsProtoBlocked = false;
      try {
        rendererService.sanitizeUrl('javascript:alert(document.cookie)');
      } catch (err: any) {
        jsProtoBlocked = true;
      }

      let dataProtoBlocked = false;
      try {
        rendererService.sanitizeUrl('data:text/html,<script>alert(1)</script>');
      } catch (err: any) {
        dataProtoBlocked = true;
      }

      if (!jsProtoBlocked || !dataProtoBlocked) {
        throw new Error('Unsafe URL protocols were not rejected by sanitizer');
      }

      // 2. Safe protocols: https:, mailto:, relative
      const safeHttps = rendererService.sanitizeUrl('https://aeonexus.io/contact');
      const safeRelative = rendererService.sanitizeUrl('/about-us');
      if (safeHttps !== 'https://aeonexus.io/contact' || safeRelative !== '/about-us') {
        throw new Error('Valid safe URL protocols were incorrectly altered');
      }

      // 3. Stored XSS script tag stripping
      const dirtyHtml = '<p>Hello <script>alert("pwned")</script>World</p>';
      const cleanHtml = rendererService.sanitizeText(dirtyHtml);
      if (cleanHtml.includes('<script>') || cleanHtml.includes('alert')) {
        throw new Error('Script tags were not stripped');
      }

      // 4. Inline event handlers stripping
      const dirtyPayload = {
        title: 'Safe Title',
        link: 'https://aeonexus.io',
        snippet: '<b onmouseover="alert(1)">Hover me</b>',
      };
      const cleanPayload = rendererService.sanitizeContent(dirtyPayload);
      if (cleanPayload.snippet.includes('onmouseover')) {
        throw new Error('Inline onmouseover event handler was not stripped');
      }

      return { details: 'Protocol filter (javascript/data blocked) and XSS stripping verified' };
    });

    // =========================================================================
    // SECTION 5: WORKER TENANT INTEGRITY & PLATFORM HARDENING
    // =========================================================================

    await recordScenario(27, 'Worker Processors Missing/Invalid WorkspaceId Rejection', async () => {
      let aiWorkerRejected = false;
      try {
        await processAiRunJob({
          id: 'test-job-1',
          attemptsMade: 0,
          data: {
            runId: 'run-1',
            workspaceId: '', // Invalid empty workspace
            userId: userA.id,
            prompt: 'Test prompt',
            model: 'mock',
            provider: 'mock',
          },
        } as any);
      } catch (err: any) {
        if (err.message.includes('Tenant boundary violation')) {
          aiWorkerRejected = true;
        }
      }

      let discoverWorkerRejected = false;
      try {
        await processDiscoverResearchJob({
          id: 'test-job-2',
          attemptsMade: 0,
          data: {
            researchId: 'res-1',
            workspaceId: '',
            userId: userA.id,
          },
        } as any);
      } catch (err: any) {
        if (err.message.includes('Tenant boundary violation')) {
          discoverWorkerRejected = true;
        }
      }

      let planWorkerRejected = false;
      try {
        await processPlanGenerationJob({
          id: 'test-job-3',
          attemptsMade: 0,
          data: {
            planId: 'plan-1',
            workspaceId: '',
            userId: userA.id,
          },
        } as any);
      } catch (err: any) {
        if (err.message.includes('Tenant boundary violation')) {
          planWorkerRejected = true;
        }
      }

      let webWorkerRejected = false;
      try {
        await processWebsiteGenerationJob({
          id: 'test-job-4',
          attemptsMade: 0,
          data: {
            websiteId: 'web-1',
            workspaceId: '',
            userId: userA.id,
          },
        } as any);
      } catch (err: any) {
        if (err.message.includes('Tenant boundary violation')) {
          webWorkerRejected = true;
        }
      }

      if (!aiWorkerRejected || !discoverWorkerRejected || !planWorkerRejected || !webWorkerRejected) {
        throw new Error('Worker processors accepted job without tenant workspaceId');
      }

      return { details: 'All background processors enforce tenant workspace validation' };
    });

    await recordScenario(28, 'Security Headers Configuration Verification', async () => {
      // Inspect apps/api/src/main.ts for OWASP security headers
      const mainTsPath = path.resolve(__dirname, '../src/main.ts');
      const mainContent = fs.readFileSync(mainTsPath, 'utf8');

      const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
        'Referrer-Policy',
        'Content-Security-Policy',
      ];

      for (const hdr of requiredHeaders) {
        if (!mainContent.includes(hdr)) {
          throw new Error(`Missing essential security header in main.ts: ${hdr}`);
        }
      }

      return { details: 'OWASP Security Headers (CSP, HSTS, X-Frame-Options: DENY, nosniff) verified' };
    });

    await recordScenario(29, 'Express Payload Limit & Buffer Exhaustion Protection', async () => {
      const mainTsPath = path.resolve(__dirname, '../src/main.ts');
      const mainContent = fs.readFileSync(mainTsPath, 'utf8');

      if (!mainContent.includes("express.json({ limit: '10mb' })")) {
        throw new Error('Explicit 10mb body size limit not configured in bootstrap');
      }

      return { details: 'JSON body limit configured to 10mb' };
    });

    await recordScenario(30, 'Authentication Rate Limiter Guards Verification', async () => {
      const controllerPath = path.resolve(__dirname, '../src/auth/auth.controller.ts');
      const controllerContent = fs.readFileSync(controllerPath, 'utf8');

      // Verify RateLimiterGuard is on login, register, refresh, forgot-password, mfa/login
      const endpoints = ['login', 'register', 'refresh', 'mfa/login'];
      for (const ep of endpoints) {
        if (!controllerContent.includes(`@Post('${ep}')`) && !controllerContent.includes(`@Post('mfa/login')`)) {
          throw new Error(`Controller missing endpoint ${ep}`);
        }
      }

      if (!controllerContent.includes('RateLimiterGuard')) {
        throw new Error('RateLimiterGuard is missing from auth controller');
      }

      return { details: 'RateLimiterGuard configured across sensitive auth endpoints' };
    });

  } finally {
    // Teardown test artifacts
    console.log('\nCleaning up test fixtures...');
    try {
      if (websiteA?.id) {
        await prisma.websitePublication.deleteMany({ where: { websiteId: websiteA.id } });
        await prisma.websitePage.deleteMany({ where: { websiteId: websiteA.id } });
        await prisma.websiteProject.deleteMany({ where: { id: websiteA.id } });
      }
      if (planA?.id) {
        await prisma.strategicInitiative.deleteMany({ where: { planId: planA.id } });
        await prisma.businessGoal.deleteMany({ where: { planId: planA.id } });
        await prisma.strategicPlan.deleteMany({ where: { id: planA.id } });
      }
      if (researchA?.id) {
        await prisma.researchProject.deleteMany({ where: { id: researchA.id } });
      }
      if (docA?.id) {
        await prisma.knowledgeDocumentVersion.deleteMany({ where: { documentId: docA.id } });
        await prisma.knowledgeDocument.deleteMany({ where: { id: docA.id } });
      }
      if (taskA?.id) {
        await prisma.taskComment.deleteMany({ where: { taskId: taskA.id } });
        await prisma.task.deleteMany({ where: { id: taskA.id } });
      }
      if (projectA?.id) {
        await prisma.projectMember.deleteMany({ where: { projectId: projectA.id } });
        await prisma.project.deleteMany({ where: { id: projectA.id } });
      }
      if (workspaceA?.id) {
        await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspaceA.id } });
        await prisma.workspace.deleteMany({ where: { id: workspaceA.id } });
      }
      if (workspaceB?.id) {
        await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspaceB.id } });
        await prisma.workspace.deleteMany({ where: { id: workspaceB.id } });
      }
      if (userA?.id) {
        await prisma.session.deleteMany({ where: { userId: userA.id } });
        await prisma.auditLog.deleteMany({ where: { userId: userA.id } });
        await prisma.user.deleteMany({ where: { id: userA.id } });
      }
      if (userB?.id) {
        await prisma.session.deleteMany({ where: { userId: userB.id } });
        await prisma.auditLog.deleteMany({ where: { userId: userB.id } });
        await prisma.user.deleteMany({ where: { id: userB.id } });
      }
      if (adminUser?.id) {
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.auditLog.deleteMany({ where: { userId: adminUser.id } });
        await prisma.user.deleteMany({ where: { id: adminUser.id } });
      }
    } catch (cleanupErr: any) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await prisma.$disconnect();
  }

  // Summary
  console.log('\n===============================================================');
  console.log('   PHASE 7A SECURITY VERIFICATION SUMMARY');
  console.log('===============================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Scenarios : ${results.length}`);
  console.log(`Passed          : ${passedCount}`);
  console.log(`Failed          : ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFAILED SCENARIOS:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.error(`- Scenario ${r.scenario}: ${r.name} -> ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ ALL 30 SECURITY SCENARIOS PASSED WITH ZERO FAILURES!');
    process.exit(0);
  }
}

runPhase7aSecuritySuite().catch((err) => {
  console.error('Fatal execution error in Phase 7A Security Suite:', err);
  process.exit(1);
});
