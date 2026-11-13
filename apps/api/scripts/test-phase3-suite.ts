/**
 * Phase 3 Automated Verification Suite
 * Tests Business Context, Brand Identity, Onboarding Progress, Dashboard Summary,
 * Application Catalog, and Cross-Workspace Isolation against Neon PostgreSQL.
 */
import { PrismaClient } from '@prisma/client';
import { BusinessService } from '../src/business/business.service';
import { CatalogService } from '../src/catalog/catalog.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { EmailService } from '../src/email/email.service';
import { AuthService } from '../src/auth/auth.service';
import * as bcrypt from 'bcrypt';

async function runPhase3Suite() {
  console.log('================================================================');
  console.log('       AEO Nexus — Phase 3 Automated Verification Suite        ');
  console.log('================================================================');

  const prisma = new PrismaClient();
  const emailService = new EmailService();
  const authService = new AuthService(prisma, emailService);
  const workspacesService = new WorkspacesService(prisma, emailService);
  const businessService = new BusinessService(prisma);
  const catalogService = new CatalogService();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  const runId = Math.random().toString(36).substring(2, 8);
  const user1Email = `phase3.owner.${runId}@aeonexus-test.local`;
  const user2Email = `phase3.intruder.${runId}@aeonexus-test.local`;
  const password = 'Password123!';
  const pwHash = await bcrypt.hash(password, 12);

  try {
    // 1. Setup Test Users
    console.log('\n--- Scenario 1: Setup Verified Users & Workspace ---');
    const user1 = await prisma.user.create({
      data: {
        email: user1Email,
        passwordHash: pwHash,
        firstName: 'Elena',
        lastName: 'Rostova',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const user2 = await prisma.user.create({
      data: {
        email: user2Email,
        passwordHash: pwHash,
        firstName: 'Marcus',
        lastName: 'Vance',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    const ws1 = await workspacesService.createWorkspace(user1.id, {
      name: `Nexus Enterprises ${runId}`,
      slug: `nexus-ent-${runId}`,
    });

    assert(!!ws1.id && ws1.name.includes('Nexus Enterprises'), 'Workspace created with user1 as owner');

    // 2. Business Profile Persistence & Retrieval
    console.log('\n--- Scenario 2: Business Profile Configuration ---');
    const bizSaved = await businessService.saveBusinessProfile(ws1.id, user1.id, {
      businessName: 'Nexus Global AI Inc.',
      website: 'https://nexusglobal.ai',
      industry: 'Enterprise Software & Artificial Intelligence',
      country: 'United States',
      businessSize: '11-50 employees',
      description: 'Autonomous business operating system orchestrating multi-modal workflows.',
    });

    assert(bizSaved.businessName === 'Nexus Global AI Inc.', 'Business profile created with correct name');
    assert(bizSaved.industry.includes('Enterprise Software'), 'Industry category preserved');

    const bizFetched = await businessService.getBusinessProfile(ws1.id, user1.id);
    assert(bizFetched?.country === 'United States', 'Business profile retrieved accurately');

    // 3. Brand Identity Profile
    console.log('\n--- Scenario 3: Brand Identity Profile ---');
    const brandSaved = await businessService.saveBrandProfile(ws1.id, user1.id, {
      logoUrl: 'https://cdn.aeonexus.local/logos/nexus-mark.svg',
      primaryColor: '#3563F6',
      secondaryColor: '#6554E8',
      brandVoice: 'Authoritative, innovative, transparent and conversion-focused',
      description: 'Futuristic yet enterprise-ready visual and editorial identity.',
    });

    assert(brandSaved.primaryColor === '#3563F6', 'Primary brand color hex validated');
    assert(brandSaved.secondaryColor === '#6554E8', 'Secondary violet accent validated');

    const brandFetched = await businessService.getBrandProfile(ws1.id, user1.id);
    assert(brandFetched?.brandVoice?.includes('Authoritative'), 'Brand voice retrieved correctly');

    // 4. Onboarding Progress Tracking & Resumption
    console.log('\n--- Scenario 4: Multi-Step Onboarding Progress ---');
    const initProgress = await businessService.getOnboardingProgress(ws1.id, user1.id);
    assert(initProgress !== null, 'Onboarding record automatically initialized');

    const stepGoals = await businessService.saveOnboardingStep(ws1.id, user1.id, {
      step: 'goals',
      goals: ['improve_visibility', 'generate_leads', 'automate_tasks'],
      data: { targetQuarter: 'Q1' },
    });

    assert(stepGoals.goals.includes('generate_leads'), 'Strategic goals stored in onboarding state');
    assert(stepGoals.completedSteps.includes('goals'), 'Step marked completed');

    const completeResult = await businessService.completeOnboarding(ws1.id, user1.id);
    assert(completeResult.completed === true, 'Onboarding completion finalized');

    const finalProgress = await businessService.getOnboardingProgress(ws1.id, user1.id);
    assert(finalProgress?.completed === true, 'Onboarding completed flag confirmed in database');

    // 5. Workspace Preferences
    console.log('\n--- Scenario 5: Workspace Preferences & Settings ---');
    const prefUpdated = await businessService.updatePreferences(ws1.id, user1.id, {
      timezone: 'America/New_York',
      currency: 'USD',
      emailNotifications: true,
      weeklyDigest: true,
      marketingUpdates: false,
    });

    assert(prefUpdated.timezone === 'America/New_York', 'Timezone preference updated');
    assert(prefUpdated.weeklyDigest === true, 'Weekly digest preference saved');

    // 6. Customer Dashboard Summary Computation
    console.log('\n--- Scenario 6: Customer Dashboard Aggregation ---');
    const summary = await businessService.getDashboardSummary(ws1.id, user1.id);

    assert(summary.workspace.name === ws1.name, 'Dashboard summary returns active workspace info');
    assert(summary.profileCompletion >= 75, `Profile completion calculated correctly (${summary.profileCompletion}%)`);
    assert(summary.checklist.length === 5, 'Checklist has all 5 actionable milestones');
    assert(summary.checklist.find((c) => c.id === 'check-business')?.completed === true, 'Business profile checklist item complete');
    assert(summary.checklist.find((c) => c.id === 'check-brand')?.completed === true, 'Brand profile checklist item complete');
    assert(summary.recentTools.length >= 4, 'Essential tools surfaced for immediate access');
    assert(summary.recentActivity.length > 0, 'Recent activity log reflects onboarding events');

    // 7. Centralized Application Catalog
    console.log('\n--- Scenario 7: Application Catalog Architecture ---');
    const allApps = catalogService.list();
    assert(allApps.length >= 8, `Catalog loaded ${allApps.length} tools across categories`);

    const opApps = catalogService.list('Operations');
    assert(opApps.length >= 2, 'Category filter returns matching operational tools');

    const searchApps = catalogService.list(undefined, 'Brand');
    assert(searchApps.some((a) => a.slug === 'brand-identity'), 'Query search matches tool by keyword');

    const singleApp = catalogService.getBySlug('business-profile');
    assert(singleApp.status === 'functional', 'Business Profile correctly labeled functional');

    const aiApp = catalogService.getBySlug('ai-business-agent');
    assert(aiApp.status === 'coming-soon', 'AI Business Agent honestly labeled coming-soon');

    // 8. Cross-Workspace Tenant Isolation Security Check
    console.log('\n--- Scenario 8: Cross-Workspace Tenant Isolation ---');
    let crossAccessBlocked = false;
    try {
      // User 2 attempts to read User 1's business context
      await businessService.getBusinessProfile(ws1.id, user2.id);
    } catch (err: any) {
      if (err.status === 403 || err.message?.includes('Access denied')) {
        crossAccessBlocked = true;
      }
    }
    assert(crossAccessBlocked, 'Cross-workspace unauthorized access strictly blocked with HTTP 403');

    let crossDashboardBlocked = false;
    try {
      // User 2 attempts to view User 1's dashboard summary
      await businessService.getDashboardSummary(ws1.id, user2.id);
    } catch (err: any) {
      if (err.status === 403 || err.message?.includes('Access denied')) {
        crossDashboardBlocked = true;
      }
    }
    assert(crossDashboardBlocked, 'Cross-workspace dashboard telemetry access strictly blocked');

    console.log('\n================================================================');
    console.log(`Test Execution Completed: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    // Clean up test data
    try {
      await prisma.workspace.deleteMany({
        where: { slug: { startsWith: `nexus-ent-${runId}` } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [user1Email, user2Email] } },
      });
      await prisma.$disconnect();
    } catch {
      // Ignore teardown errors
    }
  }
}

runPhase3Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

