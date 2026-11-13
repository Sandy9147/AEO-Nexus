/**
 * AEO Nexus — Phase 6A Automated Verification Test Suite
 * Discover — AI Business Research & Opportunity Intelligence
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

import { PrismaClient, ResearchStatus, EvidenceType, ConfidenceLevel, SourceType } from '@prisma/client';
import { DiscoverService } from '../src/discover/discover.service';
import { DiscoverOrchestratorService } from '../src/discover/discover-orchestrator.service';
import { DiscoverQueueService } from '../src/discover/discover-queue.service';
import { AiProviderRegistry } from '../src/ai/providers/provider.registry';
import { MockAiProvider } from '../src/ai/providers/mock.provider';
import { GeminiAiProvider } from '../src/ai/providers/gemini.provider';
import { OpenAiProvider } from '../src/ai/providers/openai.provider';
import { AnthropicAiProvider } from '../src/ai/providers/anthropic.provider';
import { AiUsageService } from '../src/ai/usage/usage.service';
import { WorkspaceContextService } from '../src/ai/context/workspace-context.service';
import { KnowledgeRetrievalService } from '../src/ai/retrieval/knowledge-retrieval.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';

let passedTests = 0;
let failedTests = 0;
let prisma: PrismaClient;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

async function runPhase6aTestSuite() {
  let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  if (!dbUrl.includes('connection_limit=')) {
    const sep = dbUrl.includes('?') ? '&' : '?';
    dbUrl = `${dbUrl}${sep}connection_limit=5&pool_timeout=30`;
  }
  console.log('Connecting to Neon host:', dbUrl ? dbUrl.replace(/.*@([^/]+).*/, '$1') : 'UNKNOWN');
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });
  console.log('================================================================');
  console.log('       AEO Nexus — Phase 6A Automated Verification Suite        ');
  console.log('================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  let userAlpha: any;
  let userBeta: any;
  let workspaceAlpha: any;
  let workspaceBeta: any;

  try {
    // -------------------------------------------------------------
    // Setup: Create isolated test users and workspaces
    // -------------------------------------------------------------
    console.log('--- Setup: Test Tenants & Business Profiles ---');
    userAlpha = await prisma.user.create({
      data: {
        email: `discover.alpha.${testSuffix}@example.com`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        firstName: 'Discover',
        lastName: 'Alpha',
      },
    });

    userBeta = await prisma.user.create({
      data: {
        email: `discover.beta.${testSuffix}@example.com`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        firstName: 'Discover',
        lastName: 'Beta',
      },
    });

    workspaceAlpha = await prisma.workspace.create({
      data: {
        name: `Discover Corp Alpha ${testSuffix}`,
        slug: `discover-alpha-${testSuffix}`,
        members: {
          create: {
            userId: userAlpha.id,
            role: 'WORKSPACE_OWNER',
          },
        },
        businessProfile: {
          create: {
            businessName: 'AEO Nexus Intelligence Alpha',
            industry: 'B2B SaaS',
            country: 'US',
            businessSize: '11-50',
            website: 'https://aeo-nexus-alpha.test',
            description: 'Leading Answer Engine Optimization platform for B2B enterprises.',
          },
        },
        brandProfile: {
          create: {
            brandVoice: 'Authoritative, precise, enterprise-grade',
            description: 'Growth executives and Chief Marketing Officers',
          },
        },
        aiConfig: {
          create: {
            defaultProvider: 'mock',
            defaultModel: 'mock-agent-fast',
            monthlyTokenBudget: 500000,
            monthlyCostBudget: 100.0,
          },
        },
      },
    });

    workspaceBeta = await prisma.workspace.create({
      data: {
        name: `Discover Corp Beta ${testSuffix}`,
        slug: `discover-beta-${testSuffix}`,
        members: {
          create: {
            userId: userBeta.id,
            role: 'WORKSPACE_OWNER',
          },
        },
        aiConfig: {
          create: {
            defaultProvider: 'mock',
            defaultModel: 'mock-agent-fast',
            monthlyTokenBudget: 500000,
            monthlyCostBudget: 100.0,
          },
        },
      },
    });

    assert(Boolean(workspaceAlpha.id && workspaceBeta.id), 'Workspace Alpha and Workspace Beta initialized');

    // Instantiate Services
    const mockProvider = new MockAiProvider();
    const geminiProvider = new GeminiAiProvider();
    const openAiProvider = new OpenAiProvider();
    const anthropicProvider = new AnthropicAiProvider();
    const providerRegistry = new AiProviderRegistry(mockProvider, geminiProvider, openAiProvider, anthropicProvider);
    const usageService = new AiUsageService(prisma as any);
    const workspacesService = new WorkspacesService(prisma as any, {} as any);
    const contextService = new WorkspaceContextService(prisma as any, workspacesService);
    const retrievalService = new KnowledgeRetrievalService(prisma as any);

    const orchestrator = new DiscoverOrchestratorService(
      prisma as any,
      providerRegistry,
      usageService,
      contextService,
      retrievalService,
    );

    const queueService = new DiscoverQueueService(orchestrator);
    const discoverService = new DiscoverService(prisma as any, queueService);

    // -------------------------------------------------------------
    // Scenario 1: Research Project Creation & Input Validation
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: Research Project Creation & Input Validation ---');
    const newResearch = await discoverService.createResearch(workspaceAlpha.id, userAlpha.id, {
      title: 'Q1 Answer Engine Market Opportunity Audit',
      topic: 'Answer Engine Optimization and AI Search Visibility',
      industry: 'B2B SaaS',
      targetCountry: 'United States',
      targetAudience: 'Heads of Growth & CMOs',
      businessDescription: 'Enterprise platform for tracking citation presence across LLMs.',
      objective: 'COMPREHENSIVE',
    });

    assert(Boolean(newResearch.id), 'Research project created successfully with UUID');
    assert(newResearch.title === 'Q1 Answer Engine Market Opportunity Audit', 'Research title matches input');
    assert(newResearch.workspaceId === workspaceAlpha.id, 'Research project scoped strictly to Workspace Alpha');

    // -------------------------------------------------------------
    // Scenario 2: Research Job Execution & AI Synthesis
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Research Job Execution & AI Synthesis ---');
    let completedStudy = await discoverService.getResearchDetail(workspaceAlpha.id, newResearch.id);
    let attempts = 0;
    while (completedStudy.status !== 'COMPLETED' && attempts < 15) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      completedStudy = await discoverService.getResearchDetail(workspaceAlpha.id, newResearch.id);
      attempts++;
    }

    if (completedStudy.status !== 'COMPLETED') {
      await orchestrator.executeResearch(newResearch.id, workspaceAlpha.id, userAlpha.id);
      completedStudy = await discoverService.getResearchDetail(workspaceAlpha.id, newResearch.id);
    }
    assert(completedStudy.status === 'COMPLETED', 'Research study status transitioned to COMPLETED');
    assert(Boolean(completedStudy.completedAt), 'Research study completedAt timestamp populated');
    assert(Boolean(completedStudy.executiveSummary), 'Executive summary synthesized by AI engine');
    assert(completedStudy.confidenceScore > 0.7, 'Confidence score calculated and above threshold (>= 0.70)');
    assert(completedStudy.tokensUsed > 0, 'Tokens counted and attributed to research project');

    // -------------------------------------------------------------
    // Scenario 3: Structured Findings & Evidence Attribution
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Structured Findings & Evidence Attribution ---');
    assert(completedStudy.findings.length >= 3, 'Findings array contains multiple structured findings');
    const marketDemandFinding = completedStudy.findings.find((f) => f.category === 'MARKET_DEMAND');
    assert(Boolean(marketDemandFinding), 'Market demand finding categorized correctly');
    assert(marketDemandFinding?.evidenceType === 'AI_ANALYSIS', 'Evidence type attributed as AI_ANALYSIS');
    assert(Boolean(marketDemandFinding?.evidenceDetails), 'Finding contains supporting evidence details');

    // Sources verification
    assert(completedStudy.sources.length >= 1, 'Research study generated traceable source citations');
    const firstSource = completedStudy.sources[0];
    assert(Boolean(firstSource.title), 'Source contains valid title');
    assert(Boolean(firstSource.sourceType), 'Source classified with valid SourceType');

    // -------------------------------------------------------------
    // Scenario 4: Competitor Intelligence & Benchmarking
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Competitor Intelligence & Benchmarking ---');
    assert(completedStudy.competitors.length >= 2, 'Competitors extracted and linked to research');
    const rival = completedStudy.competitors[0];
    assert(Boolean(rival.name), 'Competitor profile contains company name');
    assert(rival.strengths.length > 0, 'Competitor strengths benchmarked');
    assert(rival.weaknesses.length > 0, 'Competitor weaknesses and gaps identified');
    assert(Boolean(rival.differentiationOpportunities), 'Differentiation opportunity identified against competitor');
    assert(rival.isVerified === false, 'AI-generated competitor profile is correctly unverified');

    // Manual Competitor Creation (User Provided)
    const manualComp = await discoverService.createCompetitor(workspaceAlpha.id, {
      name: 'Custom Rival Inc',
      website: 'https://customrival.test',
      industry: 'Search Marketing',
      description: 'Hand-curated rival benchmark by analyst.',
      strengths: ['High venture funding', 'Strong enterprise relationships'],
      weaknesses: ['Legacy codebase', 'High churn rate'],
      differentiationOpportunities: 'Autonomous AI execution agents',
      evidenceType: 'USER_INPUT',
      isVerified: true,
    });
    assert(manualComp.evidenceType === 'USER_INPUT', 'User-provided competitor tagged as USER_INPUT');
    assert(manualComp.isVerified === true, 'Analyst verified competitor tagged as isVerified: true');

    // -------------------------------------------------------------
    // Scenario 5: Customer Audience & ICP Profiles
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Customer Audience & ICP Profiles ---');
    assert(completedStudy.audienceProfiles.length >= 1, 'Audience profiles generated for study');
    const persona = completedStudy.audienceProfiles[0];
    assert(persona.isAiGenerated === true, 'AI persona strictly flagged with isAiGenerated: true (Data Integrity Standard)');
    assert(persona.painPoints.length > 0, 'Persona maps acute customer pain points');
    assert(persona.buyingMotivations.length > 0, 'Persona maps buying motivations');
    assert(persona.objections.length > 0, 'Persona maps buying friction and objections');

    // -------------------------------------------------------------
    // Scenario 6: Market Opportunity Engine
    // -------------------------------------------------------------
    console.log('\n--- Scenario 6: Market Opportunity Engine ---');
    assert(completedStudy.opportunities.length >= 2, 'Opportunities synthesized by research engine');
    const opp = completedStudy.opportunities[0];
    assert(Boolean(opp.customerProblem), 'Opportunity defines customer problem');
    assert(Boolean(opp.marketDemandEvidence), 'Opportunity includes market demand evidence');
    assert(Boolean(opp.differentiation), 'Opportunity articulates differentiation advantage');
    assert(Boolean(opp.suggestedExperiment), 'Opportunity mandates concrete validation experiment');
    assert(opp.status === 'DISCOVERED', 'New opportunity initialized in DISCOVERED status');

    // Opportunity Status Transition
    const updatedOpp = await discoverService.updateOpportunity(workspaceAlpha.id, opp.id, {
      status: 'VALIDATING',
    });
    assert(updatedOpp.status === 'VALIDATING', 'Opportunity status successfully transitioned to VALIDATING');

    // -------------------------------------------------------------
    // Scenario 7: AEO Research Diagnostics & Citations
    // -------------------------------------------------------------
    console.log('\n--- Scenario 7: AEO Research Diagnostics & Citations ---');
    assert(completedStudy.aeoQuestions.length >= 1, 'AEO research questions generated');
    const aeoQ = completedStudy.aeoQuestions[0];
    assert(Boolean(aeoQ.queryQuestion), 'AEO query question text recorded');
    assert(aeoQ.results !== undefined && aeoQ.results.length > 0, 'AEO diagnostic results attached to question');
    const result = aeoQ.results![0];
    assert(result.isActualMeasurement === false, 'Synthetic audit is explicitly tagged as isActualMeasurement: false');
    assert(result.brandMentioned === true, 'Brand mention detected in evaluation run');

    // -------------------------------------------------------------
    // Scenario 8: AI Provider Failure & Error Handling
    // -------------------------------------------------------------
    console.log('\n--- Scenario 8: AI Provider Failure & Error Handling ---');
    const failingResearch = await discoverService.createResearch(workspaceAlpha.id, userAlpha.id, {
      title: 'Failing Provider Test Study',
      topic: 'Test topic designed to verify failure handling',
      objective: 'COMPREHENSIVE',
    });

    // Configure an invalid provider name to trigger error in orchestrator
    await prisma.aIWorkspaceConfig.update({
      where: { workspaceId: workspaceAlpha.id },
      data: { defaultProvider: 'unconfigured_broken_provider', defaultModel: 'broken-model' },
    });

    // Mock an error by throwing inside adapter or checking failure state
    let caughtError = false;
    try {
      // Temporarily sabotage provider to test resilient recording
      const brokenRegistry = {
        getAdapter: () => {
          throw new Error('Simulated upstream AI provider network timeout (HTTP 503)');
        },
      } as any;

      const failingOrchestrator = new DiscoverOrchestratorService(
        prisma as any,
        brokenRegistry,
        usageService,
        contextService,
        retrievalService,
      );

      await failingOrchestrator.executeResearch(failingResearch.id, workspaceAlpha.id, userAlpha.id);
    } catch (e: any) {
      caughtError = true;
      assert(e.message.includes('Simulated upstream AI provider network timeout'), 'Upstream provider failure caught');
    }

    assert(caughtError, 'Error thrown on provider failure');
    const failedStudyRecord = await prisma.researchProject.findUnique({ where: { id: failingResearch.id } });
    assert(failedStudyRecord?.status === 'FAILED', 'Research project status marked as FAILED in database');

    const failedRunRecord = await prisma.researchRun.findFirst({
      where: { researchId: failingResearch.id, status: 'FAILED' },
    });
    assert(Boolean(failedRunRecord?.error), 'ResearchRun record captures error trace details');

    // Reset workspace config back to mock
    await prisma.aIWorkspaceConfig.update({
      where: { workspaceId: workspaceAlpha.id },
      data: { defaultProvider: 'mock', defaultModel: 'mock-agent-fast' },
    });

    // -------------------------------------------------------------
    // Scenario 9: Invalid Structured Output Resilience & Safe Fallback
    // -------------------------------------------------------------
    console.log('\n--- Scenario 9: Invalid Output Resilience & Safe Fallback ---');
    const malformedTextResearch = await discoverService.createResearch(workspaceAlpha.id, userAlpha.id, {
      title: 'Malformed Output Test Study',
      topic: 'Test Topic for Non-JSON text output',
      objective: 'COMPREHENSIVE',
    });

    // Simulate an AI provider returning non-JSON freeform text
    const textOnlyRegistry = {
      getAdapter: () => ({
        id: 'mock',
        isConfigured: () => true,
        getAvailableModels: () => [{ id: 'mock-model' }],
        generateCompletion: async () => ({
          content: 'Here is an unstructured text report: The market is growing rapidly with strong demand.',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        }),
      }),
    } as any;

    const fallbackOrchestrator = new DiscoverOrchestratorService(
      prisma as any,
      textOnlyRegistry,
      usageService,
      contextService,
      retrievalService,
    );

    await fallbackOrchestrator.executeResearch(malformedTextResearch.id, workspaceAlpha.id, userAlpha.id);
    const fallbackStudy = await discoverService.getResearchDetail(workspaceAlpha.id, malformedTextResearch.id);
    assert(fallbackStudy.status === 'COMPLETED', 'Malformed output parsed safely without crashing');
    assert(fallbackStudy.findings.length >= 1, 'Fallback parser created structured finding from raw text');

    // -------------------------------------------------------------
    // Scenario 10: Usage Metering & Hard Budget Limits
    // -------------------------------------------------------------
    console.log('\n--- Scenario 10: Usage Metering & Hard Budget Limits ---');
    // Set token budget to 0 to simulate budget exhaustion
    await prisma.aIWorkspaceConfig.update({
      where: { workspaceId: workspaceAlpha.id },
      data: { monthlyTokenBudget: 0 },
    });

    let budgetBlocked = false;
    try {
      const budgetTestStudy = await discoverService.createResearch(workspaceAlpha.id, userAlpha.id, {
        title: 'Budget Test Study',
        topic: 'Checking budget limits',
      });
      await orchestrator.executeResearch(budgetTestStudy.id, workspaceAlpha.id, userAlpha.id);
    } catch (e: any) {
      budgetBlocked = true;
      assert(e.message.toLowerCase().includes('exceeded'), 'Research blocked by hard token budget enforcement');
    }
    assert(budgetBlocked, 'Hard monthly budget limits enforced');

    // Restore budget
    await prisma.aIWorkspaceConfig.update({
      where: { workspaceId: workspaceAlpha.id },
      data: { monthlyTokenBudget: 500000 },
    });

    // -------------------------------------------------------------
    // Scenario 11: Multi-Tenant Workspace Security & Isolation
    // -------------------------------------------------------------
    console.log('\n--- Scenario 11: Multi-Tenant Workspace Security & Isolation ---');
    let tenantIsolated = false;
    try {
      // User Beta attempts to query Workspace Alpha's research study
      await discoverService.getResearchDetail(workspaceBeta.id, newResearch.id);
    } catch (e: any) {
      tenantIsolated = true;
      assert(e.message.includes('not found in workspace'), 'Intruder blocked from viewing foreign research study');
    }
    assert(tenantIsolated, 'Strict multi-tenant workspace perimeter maintained');

    // -------------------------------------------------------------
    // Scenario 12: Research Cancellation State Machine
    // -------------------------------------------------------------
    console.log('\n--- Scenario 12: Research Cancellation State Machine ---');
    const cancelTarget = await discoverService.createResearch(workspaceAlpha.id, userAlpha.id, {
      title: 'Study To Be Cancelled',
      topic: 'Cancellation workflow testing',
    });

    const cancelResult = await discoverService.cancelResearch(workspaceAlpha.id, cancelTarget.id);
    assert(cancelResult.status === 'CANCELLED', 'Pending study successfully transitioned to CANCELLED');

    let completedCancelBlocked = false;
    try {
      // Attempting to cancel already completed study must fail
      await discoverService.cancelResearch(workspaceAlpha.id, newResearch.id);
    } catch (e: any) {
      completedCancelBlocked = true;
      assert(e.message.includes('Cannot cancel an already completed research project'), 'Completed study cannot be cancelled');
    }
    assert(completedCancelBlocked, 'Invalid state transitions properly rejected');

    // -------------------------------------------------------------
    // Scenario 13: Discover Dashboard Overview Aggregation
    // -------------------------------------------------------------
    console.log('\n--- Scenario 13: Discover Dashboard Overview Aggregation ---');
    const overview = await discoverService.getOverview(workspaceAlpha.id);
    assert(overview.totalResearch >= 2, 'Overview tracks total research count');
    assert(overview.completedResearch >= 1, 'Overview tracks completed research count');
    assert(overview.totalOpportunities >= 2, 'Overview tracks total opportunities');
    assert(overview.totalCompetitors >= 2, 'Overview tracks total competitors');
    assert(overview.totalAudienceProfiles >= 1, 'Overview tracks total audience profiles');
    assert(overview.recentResearch.length > 0, 'Overview populates recent research list');

  } catch (fatalError) {
    console.error('Fatal error during Phase 6A test suite execution:', fatalError);
    failedTests++;
  } finally {
    // -------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------
    console.log('\n--- Cleaning up test records ---');
    try {
      if (workspaceAlpha?.id) {
        await prisma.workspace.delete({ where: { id: workspaceAlpha.id } });
      }
      if (workspaceBeta?.id) {
        await prisma.workspace.delete({ where: { id: workspaceBeta.id } });
      }
      if (userAlpha?.id) {
        await prisma.user.delete({ where: { id: userAlpha.id } });
      }
      if (userBeta?.id) {
        await prisma.user.delete({ where: { id: userBeta.id } });
      }
      console.log('  [PASS] Test tenants and data cleaned up successfully');
    } catch (cleanUpErr) {
      console.warn('  [WARN] Cleanup encountered an error:', cleanUpErr);
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`PHASE 6A TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase6aTestSuite();
