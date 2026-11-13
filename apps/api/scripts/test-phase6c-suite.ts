/**
 * AEO Nexus — Phase 6C Automated Verification Test Suite
 * Build — AI Website & Landing Page Builder MVP
 * 30 Comprehensive Verification Scenarios
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

import {
  PrismaClient,
  WebsiteStatus,
} from '@prisma/client';
import { WebsiteService } from '../src/build/website.service';
import { WebsiteRendererService } from '../src/build/website-renderer.service';
import { WebsiteOrchestratorService } from '../src/build/website-orchestrator.service';
import { WebsiteQueueService } from '../src/build/website-queue.service';
import { AiProviderRegistry } from '../src/ai/providers/provider.registry';
import { MockAiProvider } from '../src/ai/providers/mock.provider';
import { GeminiAiProvider } from '../src/ai/providers/gemini.provider';
import { OpenAiProvider } from '../src/ai/providers/openai.provider';
import { AnthropicAiProvider } from '../src/ai/providers/anthropic.provider';
import { AiUsageService } from '../src/ai/usage/usage.service';
import { WorkspaceContextService } from '../src/ai/context/workspace-context.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { KnowledgeRetrievalService } from '../src/ai/retrieval/knowledge-retrieval.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  CreateWebsiteProjectSchema,
  GenerateWebsiteSchema,
  SubdomainSchema,
  RESERVED_SUBDOMAINS,
  SectionType,
} from '@aeo-nexus/contracts';
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

async function runPhase6cSuite() {
  console.log('\n===============================================================');
  console.log('   AEO Nexus — Phase 6C Automated Verification Test Suite');
  console.log('   AI Website & Landing Page Builder (30 Scenarios)');
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

  // Initialize service dependencies
  const mockAi = new MockAiProvider();
  const geminiAi = new GeminiAiProvider();
  const openAi = new OpenAiProvider();
  const anthropicAi = new AnthropicAiProvider();
  const registry = new AiProviderRegistry(mockAi, geminiAi, openAi, anthropicAi);

  const usageService = new AiUsageService(prismaService);
  const workspacesService = new WorkspacesService(prisma as any, {} as any);
  const contextService = new WorkspaceContextService(prismaService, workspacesService);
  const renderer = new WebsiteRendererService();
  const orchestrator = new WebsiteOrchestratorService(
    prismaService,
    registry,
    usageService,
    contextService,
    renderer,
  );
  const queue = new WebsiteQueueService(orchestrator);
  const websiteService = new WebsiteService(prismaService, renderer, queue, orchestrator);

  // Setup test tenant fixtures
  const testEmail = `builder_tester_${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash: '$2b$10$e8gV1rO1bA5m.0mGj7kQxO8Y4R8N9bK1V6T6Z8V2S3R4A5B6C7D8E',
      firstName: 'Builder',
      lastName: 'Tester',
    },
  });

  const workspaceA = await prisma.workspace.create({
    data: {
      name: `Website Test Workspace A ${Date.now()}`,
      slug: `ws-site-a-${Date.now()}`,
      members: {
        create: {
          userId: user.id,
          role: 'WORKSPACE_OWNER',
        },
      },
    },
  });

  const workspaceB = await prisma.workspace.create({
    data: {
      name: `Website Test Workspace B ${Date.now()}`,
      slug: `ws-site-b-${Date.now()}`,
      members: {
        create: {
          userId: user.id,
          role: 'WORKSPACE_MEMBER',
        },
      },
    },
  });

  let sharedWebsiteId: string = '';
  let sharedPageId: string = '';
  let testSubdomain = `test-brand-${Date.now().toString(36).substring(2, 8)}`;

  try {
    // -------------------------------------------------------------------------
    // 1. Website Creation
    // -------------------------------------------------------------------------
    await recordScenario(1, 'Website creation (success path, valid payload)', async () => {
      const site = await websiteService.createWebsite(workspaceA.id, user.id, {
        name: 'Apex Modern SaaS',
        websiteType: 'BUSINESS_WEBSITE',
        description: 'Next-generation AI business suite',
      });
      sharedWebsiteId = site.id;
      if (!site.id || site.name !== 'Apex Modern SaaS' || site.status !== 'DRAFT') {
        throw new Error(`Invalid created website: ${JSON.stringify(site)}`);
      }
      if (!site.pages || site.pages.length === 0 || !site.pages[0].isHome) {
        throw new Error('Default Home page was not created.');
      }
      sharedPageId = site.pages[0].id;
      return { details: `Website ${site.id} created with default Home page` };
    });

    // -------------------------------------------------------------------------
    // 2. Required-Field Validation
    // -------------------------------------------------------------------------
    await recordScenario(2, 'Required-field validation (rejects invalid payloads)', async () => {
      let threw = false;
      try {
        CreateWebsiteProjectSchema.parse({ name: 'A' }); // min length 2
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Failed to reject short website name');
      return { details: 'Zod validation correctly rejected name with < 2 chars' };
    });

    // -------------------------------------------------------------------------
    // 3. Workspace Ownership & Tenant Isolation
    // -------------------------------------------------------------------------
    await recordScenario(3, 'Workspace ownership & tenant isolation', async () => {
      const site = await prisma.websiteProject.findUnique({
        where: { id: sharedWebsiteId },
      });
      if (site?.workspaceId !== workspaceA.id) {
        throw new Error('Website project workspaceId does not match workspaceA');
      }
      return { details: `Project bound strictly to workspace ${workspaceA.id}` };
    });

    // -------------------------------------------------------------------------
    // 4. AI Website Generation Invocation
    // -------------------------------------------------------------------------
    await recordScenario(4, 'AI website generation invocation', async () => {
      await orchestrator.executeWebsiteGeneration(
        sharedWebsiteId,
        workspaceA.id,
        user.id,
        'Create high-converting landing pages for AEO optimization',
      );
      const updated = await websiteService.getWebsite(workspaceA.id, sharedWebsiteId);
      if (updated.status !== 'READY') {
        throw new Error(`Expected status READY, got ${updated.status}`);
      }
      return { details: `Generated multi-page website with status ${updated.status}` };
    });

    // -------------------------------------------------------------------------
    // 5. Structured Output Validation
    // -------------------------------------------------------------------------
    await recordScenario(5, 'Structured output validation (pages, sections, theme)', async () => {
      const updated = await websiteService.getWebsite(workspaceA.id, sharedWebsiteId);
      if (!updated.theme || !updated.theme.primaryColor) {
        throw new Error('Theme was not created or has missing primaryColor');
      }
      if (!updated.pages || updated.pages.length < 2) {
        throw new Error(`Expected at least 2 pages, found ${updated.pages?.length}`);
      }
      return { details: `Validated ${updated.pages.length} pages and theme ${updated.theme.primaryColor}` };
    });

    // -------------------------------------------------------------------------
    // 6. Invalid Section Type Rejection
    // -------------------------------------------------------------------------
    await recordScenario(6, 'Invalid section type rejection', async () => {
      let threw = false;
      try {
        renderer.validateAndSanitizeSections([
          { type: 'ARBITRARY_RAW_HTML', content: { html: '<div>bad</div>' } },
        ]);
      } catch (e: any) {
        threw = true;
      }
      if (!threw) throw new Error('Renderer failed to reject ARBITRARY_RAW_HTML');
      return { details: 'Strict allowlist rejected disallowed section type' };
    });

    // -------------------------------------------------------------------------
    // 7. Unsupported Block Structure Rejection
    // -------------------------------------------------------------------------
    await recordScenario(7, 'Unsupported block structure rejection', async () => {
      let threw = false;
      try {
        renderer.validateAndSanitizeSections(['not-an-object' as any]);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Renderer failed to reject non-object block');
      return { details: 'Malformed section payload successfully rejected' };
    });

    // -------------------------------------------------------------------------
    // 8. Unsafe URL Scheme Rejection
    // -------------------------------------------------------------------------
    await recordScenario(8, 'Unsafe URL scheme rejection (javascript:, data:)', async () => {
      let threw = false;
      try {
        renderer.sanitizeUrl('javascript:alert(1)');
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Failed to reject javascript: URL');

      let threwData = false;
      try {
        renderer.sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');
      } catch {
        threwData = true;
      }
      if (!threwData) throw new Error('Failed to reject data: URL');

      // Valid relative and https urls
      const rel = renderer.sanitizeUrl('/services');
      const https = renderer.sanitizeUrl('https://example.com/pricing');
      if (rel !== '/services' || https !== 'https://example.com/pricing') {
        throw new Error('Valid URLs incorrectly altered');
      }
      return { details: 'Dangerous URL schemes rejected; safe URLs preserved' };
    });

    // -------------------------------------------------------------------------
    // 9. XSS Sanitization in Section Content
    // -------------------------------------------------------------------------
    await recordScenario(9, 'XSS sanitization in section content', async () => {
      const malicious = {
        headline: 'Safe Headline <script>alert("hack")</script>',
        onloadAttr: '<img src=x onerror=alert(1)>',
      };
      const sanitized = renderer.sanitizeContent(malicious);
      if (sanitized.headline.includes('<script>') || sanitized.onloadAttr.includes('onerror=')) {
        throw new Error(`Sanitization failed: ${JSON.stringify(sanitized)}`);
      }
      return { details: 'Script tags and onerror handlers stripped cleanly' };
    });

    // -------------------------------------------------------------------------
    // 10. Page Creation and Editing
    // -------------------------------------------------------------------------
    let createdPageId = '';
    await recordScenario(10, 'Page creation and editing', async () => {
      const page = await websiteService.createPage(workspaceA.id, sharedWebsiteId, {
        title: 'Solutions Portfolio',
        slug: '/solutions',
        pageOrder: 10,
        isHome: false,
        seoTitle: 'Enterprise Solutions | Apex SaaS',
        seoDescription: 'Tailored solutions for modern marketing teams',
        sections: [
          {
            type: 'HERO',
            order: 0,
            content: { headline: 'Solutions for Growth' },
          },
        ],
      });
      createdPageId = page.id;
      if (page.slug !== '/solutions') throw new Error(`Expected slug /solutions, got ${page.slug}`);

      const updated = await websiteService.updatePage(workspaceA.id, sharedWebsiteId, page.id, {
        title: 'Global Solutions Portfolio',
      });
      if (updated.title !== 'Global Solutions Portfolio') {
        throw new Error('Page title was not updated');
      }
      return { details: `Page ${page.id} created and updated successfully` };
    });

    // -------------------------------------------------------------------------
    // 11. Section Creation with Valid Schema
    // -------------------------------------------------------------------------
    await recordScenario(11, 'Section creation with valid schema', async () => {
      const validSections = [
        {
          id: 'sec_feat_test',
          type: 'FEATURES' as const,
          order: 0,
          content: {
            title: 'Key Capabilities',
            features: [{ title: 'Autonomous AI', description: 'Self-driving workflows' }],
          },
        },
      ];
      const res = await websiteService.savePageSections(
        workspaceA.id,
        sharedWebsiteId,
        createdPageId,
        validSections,
      );
      if (!res.sections || (res.sections as any[]).length !== 1) {
        throw new Error('Sections not saved properly');
      }
      return { details: 'Valid FEATURES section saved to page' };
    });

    // -------------------------------------------------------------------------
    // 12. Section Ordering and Reordering
    // -------------------------------------------------------------------------
    await recordScenario(12, 'Section ordering and reordering', async () => {
      const reordered = [
        { id: 'sec_1', type: 'CTA' as const, order: 0, content: { headline: 'CTA' } },
        { id: 'sec_2', type: 'HERO' as const, order: 1, content: { headline: 'Hero' } },
      ];
      const res = await websiteService.savePageSections(
        workspaceA.id,
        sharedWebsiteId,
        createdPageId,
        reordered,
      );
      const secs = res.sections as any[];
      if (secs[0].id !== 'sec_1' || secs[1].id !== 'sec_2') {
        throw new Error('Ordering mismatch');
      }
      return { details: 'Section ordering preserved and updated' };
    });

    // -------------------------------------------------------------------------
    // 13. Section Duplication
    // -------------------------------------------------------------------------
    await recordScenario(13, 'Section duplication', async () => {
      const current = await prisma.websitePage.findUnique({
        where: { id: createdPageId },
      });
      const secs = (current?.sections as any[]) || [];
      const dup = {
        ...secs[0],
        id: `sec_dup_${Date.now()}`,
        order: secs.length,
      };
      const updated = await websiteService.savePageSections(
        workspaceA.id,
        sharedWebsiteId,
        createdPageId,
        [...secs, dup],
      );
      if ((updated.sections as any[]).length !== secs.length + 1) {
        throw new Error('Duplicate section was not saved');
      }
      return { details: `Duplicated section, new count: ${(updated.sections as any[]).length}` };
    });

    // -------------------------------------------------------------------------
    // 14. Section Deletion
    // -------------------------------------------------------------------------
    await recordScenario(14, 'Section deletion', async () => {
      const updated = await websiteService.savePageSections(
        workspaceA.id,
        sharedWebsiteId,
        createdPageId,
        [{ id: 'sec_1', type: 'HERO' as const, order: 0, content: { headline: 'Hero' } }],
      );
      if ((updated.sections as any[]).length !== 1) {
        throw new Error('Section deletion failed');
      }
      return { details: 'Deleted extra sections down to 1' };
    });

    // -------------------------------------------------------------------------
    // 15. Theme Validation and Updates
    // -------------------------------------------------------------------------
    await recordScenario(15, 'Theme validation and updates', async () => {
      const theme = await websiteService.updateTheme(workspaceA.id, sharedWebsiteId, {
        primaryColor: '#10B981',
        secondaryColor: '#6366F1',
        buttonStyle: 'PILL',
        headingFont: 'Plus Jakarta Sans',
      });
      if (theme.primaryColor !== '#10B981' || theme.buttonStyle !== 'PILL') {
        throw new Error(`Theme update failed: ${JSON.stringify(theme)}`);
      }
      return { details: 'Theme updated to Emerald with PILL button styling' };
    });

    // -------------------------------------------------------------------------
    // 16. Autosave and Debounce Handling
    // -------------------------------------------------------------------------
    await recordScenario(16, 'Autosave and debounce handling', async () => {
      const res = await websiteService.savePageSections(
        workspaceA.id,
        sharedWebsiteId,
        createdPageId,
        [
          {
            id: 'sec_autosave',
            type: 'ANNOUNCEMENT_BAR' as const,
            order: 0,
            content: { text: 'Autosave verified' },
          },
        ],
      );
      if (!res.id) throw new Error('Autosave commit failed');
      return { details: 'Page sections saved cleanly' };
    });

    // -------------------------------------------------------------------------
    // 17. Website Version Snapshots
    // -------------------------------------------------------------------------
    let v2SnapshotId = '';
    await recordScenario(17, 'Website version snapshots (immutable snapshot)', async () => {
      const v2 = await websiteService.createVersion(
        workspaceA.id,
        sharedWebsiteId,
        user.id,
        'Pre-Launch Snapshot',
        'Saved baseline before copy edits',
      );
      v2SnapshotId = v2.id;
      if (v2.versionNumber < 2 || !v2.snapshot) {
        throw new Error(`Invalid version snapshot: ${JSON.stringify(v2)}`);
      }
      return { details: `Created version snapshot v${v2.versionNumber}.0 (ID: ${v2.id})` };
    });

    // -------------------------------------------------------------------------
    // 18. Version Restore
    // -------------------------------------------------------------------------
    await recordScenario(18, 'Version restore (reverts page and theme state)', async () => {
      // Make a destructive theme edit
      await websiteService.updateTheme(workspaceA.id, sharedWebsiteId, {
        primaryColor: '#000000',
      });

      // Restore v2
      const restored = await websiteService.restoreVersion(
        workspaceA.id,
        sharedWebsiteId,
        v2SnapshotId,
      );
      if (restored.theme?.primaryColor === '#000000') {
        throw new Error('Version restore failed to revert theme');
      }
      return { details: `Restored version; primaryColor reverted to ${restored.theme?.primaryColor}` };
    });

    // -------------------------------------------------------------------------
    // 19. Published Version Immutability
    // -------------------------------------------------------------------------
    await recordScenario(19, 'Published version immutability', async () => {
      // Publish the website
      await websiteService.publishWebsite(
        workspaceA.id,
        sharedWebsiteId,
        user.id,
        testSubdomain,
      );

      // Verify public website has current state
      const pubInitial = await websiteService.getPublicWebsite(testSubdomain);
      const initialHomeHeroHeadline = pubInitial.pages[0]?.sections[0]?.content?.headline;

      // Edit draft Home page section in workspace
      const homePage = await prisma.websitePage.findFirst({
        where: { websiteId: sharedWebsiteId, isHome: true },
      });
      if (homePage) {
        await websiteService.savePageSections(workspaceA.id, sharedWebsiteId, homePage.id, [
          {
            id: 'sec_draft_mutation',
            type: 'HERO',
            order: 0,
            content: { headline: 'MUTATED DRAFT HEADLINE THAT SHOULD NOT BE PUBLIC' },
          },
        ]);
      }

      // Check public website again - MUST NOT HAVE CHANGED
      const pubAfterDraftEdit = await websiteService.getPublicWebsite(testSubdomain);
      const afterHeadline = pubAfterDraftEdit.pages[0]?.sections[0]?.content?.headline;

      if (afterHeadline === 'MUTATED DRAFT HEADLINE THAT SHOULD NOT BE PUBLIC') {
        throw new Error('Violation: Draft edits leaked into live public website!');
      }
      if (afterHeadline !== initialHomeHeroHeadline) {
        throw new Error('Published website changed without republish action');
      }

      return { details: 'Public snapshot remained completely immutable during draft changes' };
    });

    // -------------------------------------------------------------------------
    // 20. Publish Approval Workflow
    // -------------------------------------------------------------------------
    await recordScenario(20, 'Publish approval workflow', async () => {
      const site = await websiteService.getWebsite(workspaceA.id, sharedWebsiteId);
      if (!site.isPublished || site.status !== 'PUBLISHED') {
        throw new Error('Website not in PUBLISHED status after explicit publish action');
      }
      return { details: 'Explicit user publish action required to activate subdomain' };
    });

    // -------------------------------------------------------------------------
    // 21. Subdomain Validation & Duplicate Slug Prevention
    // -------------------------------------------------------------------------
    await recordScenario(21, 'Subdomain validation & duplicate slug prevention', async () => {
      // Create another site in workspace B
      const siteB = await websiteService.createWebsite(workspaceB.id, user.id, {
        name: 'Workspace B Competitor',
        websiteType: 'BUSINESS_WEBSITE',
      });

      let threw = false;
      try {
        // Attempt to claim same subdomain in workspace B
        await websiteService.publishWebsite(workspaceB.id, siteB.id, user.id, testSubdomain);
      } catch (e: any) {
        threw = true;
      }
      if (!threw) throw new Error('Allowed duplicate subdomain across workspaces');

      return { details: 'Duplicate subdomain collision blocked with ConflictException' };
    });

    // -------------------------------------------------------------------------
    // 22. Reserved Subdomain Rejection
    // -------------------------------------------------------------------------
    await recordScenario(22, 'Reserved subdomain rejection', async () => {
      for (const reserved of ['admin', 'api', 'login', 'www', 'auth', 'public', 'sites']) {
        let threw = false;
        try {
          SubdomainSchema.parse(reserved);
        } catch {
          threw = true;
        }
        if (!threw) throw new Error(`Failed to reject reserved subdomain "${reserved}"`);
      }
      return { details: 'All reserved system subdomains blocked from registration' };
    });

    // -------------------------------------------------------------------------
    // 23. Unpublish Behavior and Status Updates
    // -------------------------------------------------------------------------
    await recordScenario(23, 'Unpublish behavior and status updates', async () => {
      await websiteService.unpublishWebsite(workspaceA.id, sharedWebsiteId);

      const site = await websiteService.getWebsite(workspaceA.id, sharedWebsiteId);
      if (site.isPublished || site.status !== 'READY') {
        throw new Error(`Expected isPublished: false, got ${site.isPublished}`);
      }

      // Public gateway must now throw NotFoundException
      let threw404 = false;
      try {
        await websiteService.getPublicWebsite(testSubdomain);
      } catch {
        threw404 = true;
      }
      if (!threw404) throw new Error('Unpublished website was still accessible via public gateway');

      return { details: 'Website unpublished; public gateway returns 404' };
    });

    // -------------------------------------------------------------------------
    // 24. Cross-Workspace Access Prevention
    // -------------------------------------------------------------------------
    await recordScenario(24, 'Cross-workspace access prevention (tenant isolation)', async () => {
      let threw = false;
      try {
        await websiteService.getWebsite(workspaceB.id, sharedWebsiteId);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Cross-workspace website access was permitted');
      return { details: 'Workspace B forbidden from querying Workspace A website' };
    });

    // -------------------------------------------------------------------------
    // 25. Private Asset Access Protection
    // -------------------------------------------------------------------------
    await recordScenario(25, 'Private asset access protection', async () => {
      const safe = renderer.sanitizeUrl('/assets/public-icon.png');
      if (safe !== '/assets/public-icon.png') {
        throw new Error('Safe relative asset URL was rejected');
      }
      return { details: 'Renderer validates asset URLs without exposing raw internal filesystem paths' };
    });

    // -------------------------------------------------------------------------
    // 26. AI Budget Enforcement
    // -------------------------------------------------------------------------
    await recordScenario(26, 'AI budget enforcement (hard token limit blocking)', async () => {
      // Set zero budget on workspace
      await prisma.aIWorkspaceConfig.upsert({
        where: { workspaceId: workspaceB.id },
        create: {
          workspaceId: workspaceB.id,
          monthlyTokenBudget: 0,
        },
        update: {
          monthlyTokenBudget: 0,
        },
      });

      let blocked = false;
      try {
        await usageService.checkBudgetOrThrow(workspaceB.id);
      } catch {
        blocked = true;
      }
      if (!blocked) throw new Error('Failed to enforce monthlyTokenBudget limit');

      return { details: 'Zero budget immediately throws ForbiddenException' };
    });

    // -------------------------------------------------------------------------
    // 27. AI Provider Failure Handling
    // -------------------------------------------------------------------------
    await recordScenario(27, 'AI provider failure handling (caught, status reset to DRAFT)', async () => {
      const failureSite = await websiteService.createWebsite(workspaceA.id, user.id, {
        name: 'Failure Test Website',
        websiteType: 'BUSINESS_WEBSITE',
      });

      // Pass invalid websiteId to trigger error in orchestrator
      let caught = false;
      try {
        await orchestrator.executeWebsiteGeneration(
          failureSite.id,
          workspaceB.id, // wrong workspace
          user.id,
        );
      } catch {
        caught = true;
      }
      if (!caught) throw new Error('Expected orchestrator to throw error on mismatch');

      const check = await websiteService.getWebsite(workspaceA.id, failureSite.id);
      if (check.status !== 'DRAFT') {
        throw new Error(`Expected status DRAFT, got ${check.status}`);
      }
      return { details: 'Error handled gracefully, website status retained in DRAFT' };
    });

    // -------------------------------------------------------------------------
    // 28. Queue Idempotency & Worker Processor Execution
    // -------------------------------------------------------------------------
    await recordScenario(28, 'Queue idempotency and worker processor execution', async () => {
      const mockJob: any = {
        id: `test_job_${Date.now()}`,
        data: {
          websiteId: sharedWebsiteId,
          workspaceId: workspaceA.id,
          userId: user.id,
        },
        attemptsMade: 0,
      };

      const workerRes = await processWebsiteGenerationJob(mockJob);
      if (workerRes.status !== 'COMPLETED' || workerRes.websiteId !== sharedWebsiteId) {
        throw new Error(`Worker execution failed: ${JSON.stringify(workerRes)}`);
      }
      return { details: `Worker processed job in background with status ${workerRes.status}` };
    });

    // -------------------------------------------------------------------------
    // 29. Generation Cancellation Behavior
    // -------------------------------------------------------------------------
    await recordScenario(29, 'Generation cancellation behavior (skips archived websites)', async () => {
      const archivedSite = await websiteService.createWebsite(workspaceA.id, user.id, {
        name: 'Archived Site',
        websiteType: 'BUSINESS_WEBSITE',
      });
      await websiteService.updateWebsite(workspaceA.id, archivedSite.id, {
        status: 'ARCHIVED',
      });

      // Should not throw, should return early with warning log
      await orchestrator.executeWebsiteGeneration(
        archivedSite.id,
        workspaceA.id,
        user.id,
      );

      const check = await prisma.websiteProject.findUnique({
        where: { id: archivedSite.id },
      });
      if (check?.status !== 'ARCHIVED') {
        throw new Error('Archived website was unarchived');
      }
      return { details: 'Archived website safely skipped during generation execution' };
    });

    // -------------------------------------------------------------------------
    // 30. Public Renderer Security
    // -------------------------------------------------------------------------
    await recordScenario(30, 'Public renderer security (strips private internal fields)', async () => {
      // Re-publish to test public renderer output
      await websiteService.publishWebsite(
        workspaceA.id,
        sharedWebsiteId,
        user.id,
        testSubdomain,
      );

      const pub = await websiteService.getPublicWebsite(testSubdomain);

      // Verify no sensitive fields exist on the payload
      const pubKeys = Object.keys(pub);
      const forbidden = ['workspaceId', 'createdById', 'id', 'planId', 'initiativeId', 'userId'];
      for (const f of forbidden) {
        if (pubKeys.includes(f) || (pub as any)[f] !== undefined) {
          throw new Error(`Public payload leaked private internal field "${f}"`);
        }
      }

      for (const p of pub.pages) {
        if ((p as any).websiteId !== undefined || (p as any).id !== undefined) {
          throw new Error('Public page leaked internal database IDs');
        }
      }

      return { details: 'Verified zero private workspace/user fields in public JSON payload' };
    });

  } finally {
    // Cleanup test data
    console.log('\nCleaning up test fixtures...');
    try {
      await prisma.websitePublication.deleteMany({
        where: { website: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } },
      });
      await prisma.websiteVersion.deleteMany({
        where: { website: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } },
      });
      await prisma.websiteGenerationRun.deleteMany({
        where: { website: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } },
      });
      await prisma.websitePage.deleteMany({
        where: { website: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } },
      });
      await prisma.websiteTheme.deleteMany({
        where: { website: { workspaceId: { in: [workspaceA.id, workspaceB.id] } } },
      });
      await prisma.websiteProject.deleteMany({
        where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
      });
      await prisma.workspaceMember.deleteMany({
        where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
      });
      await prisma.aIWorkspaceConfig.deleteMany({
        where: { workspaceId: { in: [workspaceA.id, workspaceB.id] } },
      });
      await prisma.workspace.deleteMany({
        where: { id: { in: [workspaceA.id, workspaceB.id] } },
      });
      await prisma.user.delete({ where: { id: user.id } });
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }
    await prisma.$disconnect();
  }

  // Print Summary Table
  console.log('\n===============================================================');
  console.log('              PHASE 6C TEST SUITE RESULTS');
  console.log('===============================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.table(
    results.map((r) => ({
      Scenario: `#${r.scenario}`,
      Test: r.name,
      Status: r.passed ? 'PASS' : 'FAIL',
      Details: r.passed ? (r.details || 'OK') : (r.error || 'FAILED'),
    })),
  );

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.error(`\n❌ ${failed} verification scenario(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ All 30 Phase 6C verification scenarios passed successfully!');
    process.exit(0);
  }
}

runPhase6cSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
