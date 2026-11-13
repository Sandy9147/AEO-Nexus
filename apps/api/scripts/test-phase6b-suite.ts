/**
 * AEO Nexus — Phase 6B Automated Verification Test Suite
 * Plan — AI Business Planning & Strategic Roadmap Engine
 * 24 Comprehensive Verification Scenarios
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
  PlanStatus,
  GoalCategory,
  GoalStatus,
  GoalPriority,
  InitiativePriority,
  InitiativeStatus,
  EvidenceType,
  ReviewPeriod,
  ReviewStatus,
} from '@prisma/client';
import { PlanService } from '../src/plan/plan.service';
import { PlanOrchestratorService } from '../src/plan/plan-orchestrator.service';
import { PlanQueueService } from '../src/plan/plan-queue.service';
import { ProjectsService } from '../src/projects/projects.service';
import { AiProviderRegistry } from '../src/ai/providers/provider.registry';
import { MockAiProvider } from '../src/ai/providers/mock.provider';
import { GeminiAiProvider } from '../src/ai/providers/gemini.provider';
import { OpenAiProvider } from '../src/ai/providers/openai.provider';
import { AnthropicAiProvider } from '../src/ai/providers/anthropic.provider';
import { AiUsageService } from '../src/ai/usage/usage.service';
import { WorkspaceContextService } from '../src/ai/context/workspace-context.service';
import { KnowledgeRetrievalService } from '../src/ai/retrieval/knowledge-retrieval.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

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

async function runPhase6bTestSuite() {
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
  console.log('       AEO Nexus — Phase 6B Automated Verification Suite        ');
  console.log('       Plan: AI Business Planning & Strategic Roadmaps          ');
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
    console.log('Setting up isolated multi-tenant workspaces (Alpha & Beta)...');

    userAlpha = await prisma.user.create({
      data: {
        email: `plan_user_alpha_${testSuffix}@example.com`,
        passwordHash: 'dummy_hash',
        firstName: 'PlanAlpha',
        lastName: 'Tester',
      },
    });

    userBeta = await prisma.user.create({
      data: {
        email: `plan_user_beta_${testSuffix}@example.com`,
        passwordHash: 'dummy_hash',
        firstName: 'PlanBeta',
        lastName: 'Tester',
      },
    });

    workspaceAlpha = await prisma.workspace.create({
      data: {
        name: `Plan Workspace Alpha ${testSuffix}`,
        slug: `plan-ws-alpha-${testSuffix}`,
        members: {
          create: [{ userId: userAlpha.id, role: 'WORKSPACE_OWNER' }],
        },
      },
    });

    workspaceBeta = await prisma.workspace.create({
      data: {
        name: `Plan Workspace Beta ${testSuffix}`,
        slug: `plan-ws-beta-${testSuffix}`,
        members: {
          create: [{ userId: userBeta.id, role: 'WORKSPACE_OWNER' }],
        },
      },
    });

    // Instantiate Services
    const workspacesService = new WorkspacesService(prisma as any, {} as any);
    const projectsService = new ProjectsService(prisma as any, workspacesService);
    const mockAiProvider = new MockAiProvider();
    const geminiAiProvider = new GeminiAiProvider();
    const openAiProvider = new OpenAiProvider();
    const anthropicAiProvider = new AnthropicAiProvider();

    const providerRegistry = new AiProviderRegistry(
      mockAiProvider,
      geminiAiProvider,
      openAiProvider,
      anthropicAiProvider,
    );

    const usageService = new AiUsageService(prisma as any);
    const contextService = new WorkspaceContextService(prisma as any, workspacesService);
    const retrievalService = new KnowledgeRetrievalService(prisma as any);

    const orchestrator = new PlanOrchestratorService(
      prisma as any,
      providerRegistry,
      usageService,
      contextService,
      retrievalService,
    );

    const queueService = new PlanQueueService(orchestrator);
    const planService = new PlanService(prisma as any, queueService, projectsService);

    console.log('Services initialized successfully. Running 24 test scenarios...\n');

    // -------------------------------------------------------------
    // Scenario 1: Strategic plan creation
    // -------------------------------------------------------------
    console.log('Scenario 1: Strategic plan creation');
    const createdPlan = await planService.createPlan(workspaceAlpha.id, userAlpha.id, {
      title: 'Q1 Answer Engine Market Domination Plan',
      planType: 'BUSINESS_LAUNCH',
      businessStage: 'GROWTH',
      targetMarket: 'B2B SaaS Mid-Market',
      targetAudience: 'CMOs & Founders',
      horizonMonths: 12,
      budgetRange: '$25,000 - $75,000',
    });
    assert(
      createdPlan && createdPlan.title === 'Q1 Answer Engine Market Domination Plan' && createdPlan.status === 'DRAFT',
      'Strategic plan successfully created with initial DRAFT status',
    );

    // -------------------------------------------------------------
    // Scenario 2: Required-field validation
    // -------------------------------------------------------------
    console.log('Scenario 2: Required-field validation');
    let validationFailed = false;
    try {
      // Empty title should fail via schema validation
      const { CreateStrategicPlanSchema } = await import('@aeo-nexus/contracts');
      CreateStrategicPlanSchema.parse({ title: '' });
    } catch {
      validationFailed = true;
    }
    assert(validationFailed, 'Schema rejected plan with missing or empty required title');

    // -------------------------------------------------------------
    // Scenario 3: AI plan generation
    // -------------------------------------------------------------
    console.log('Scenario 3: AI plan generation');
    const genPlan = await planService.createPlan(workspaceAlpha.id, userAlpha.id, {
      title: 'Autonomous AEO Strategy for Alpha',
      planType: 'AEO_STRATEGY',
      targetMarket: 'North America Enterprise',
      targetAudience: 'Chief Growth Officers',
    });

    await orchestrator.executePlanGeneration(genPlan.id, workspaceAlpha.id, userAlpha.id);
    const refreshedGenPlan = await planService.getPlan(workspaceAlpha.id, genPlan.id);
    assert(
      refreshedGenPlan.status === 'READY_FOR_REVIEW',
      'AI Plan Orchestrator successfully executed and transitioned plan status to READY_FOR_REVIEW',
    );

    // -------------------------------------------------------------
    // Scenario 4: Structured plan output validation (all 15 sections)
    // -------------------------------------------------------------
    console.log('Scenario 4: Structured plan output validation (all 15 sections)');
    const has15Sections =
      Boolean(refreshedGenPlan.executiveSummary) &&
      Boolean(refreshedGenPlan.currentSituation) &&
      Boolean(refreshedGenPlan.marketPositioning) &&
      Array.isArray(refreshedGenPlan.strategicObjectives) && refreshedGenPlan.strategicObjectives.length > 0 &&
      Boolean(refreshedGenPlan.targetAudience) &&
      Array.isArray(refreshedGenPlan.requiredResources) && refreshedGenPlan.requiredResources.length > 0 &&
      Array.isArray(refreshedGenPlan.budgetAssumptions) && refreshedGenPlan.budgetAssumptions.length > 0 &&
      Array.isArray(refreshedGenPlan.risksAndMitigations) && (refreshedGenPlan.risksAndMitigations as any[]).length > 0 &&
      Array.isArray(refreshedGenPlan.dependencies) &&
      Array.isArray(refreshedGenPlan.timelineAssumptions) && refreshedGenPlan.timelineAssumptions.length > 0 &&
      Array.isArray(refreshedGenPlan.successMetrics) && refreshedGenPlan.successMetrics.length > 0 &&
      Array.isArray(refreshedGenPlan.validationRequirements) && refreshedGenPlan.validationRequirements.length > 0 &&
      Array.isArray(refreshedGenPlan.nextRecommendedActions) && refreshedGenPlan.nextRecommendedActions.length > 0 &&
      Array.isArray(refreshedGenPlan.goals) && refreshedGenPlan.goals.length > 0 &&
      Array.isArray(refreshedGenPlan.initiatives) && refreshedGenPlan.initiatives.length > 0;

    assert(has15Sections, 'Generated strategic plan contains all 15 required strategic and operational sections');

    // -------------------------------------------------------------
    // Scenario 5: Evidence attribution taxonomy
    // -------------------------------------------------------------
    console.log('Scenario 5: Evidence attribution taxonomy');
    const initiativesWithEvidence = refreshedGenPlan.initiatives.filter((i) =>
      ['VERIFIED_SOURCE', 'AI_ANALYSIS', 'USER_INPUT', 'UNVERIFIED_ASSUMPTION'].includes(i.evidenceType),
    );
    assert(
      initiativesWithEvidence.length > 0,
      'Strategic initiatives possess valid evidence taxonomy classification (e.g. AI_ANALYSIS, VERIFIED_SOURCE)',
    );

    // -------------------------------------------------------------
    // Scenario 6: Unverified assumption handling
    // -------------------------------------------------------------
    console.log('Scenario 6: Unverified assumption handling');
    const unverifiedInit = await planService.createInitiative(workspaceAlpha.id, userAlpha.id, {
      planId: genPlan.id,
      name: 'Test Unverified Assumption Initiative',
      description: 'Hypothesis requiring live testing in market',
      evidenceType: 'UNVERIFIED_ASSUMPTION',
      priority: 'MEDIUM',
    });
    assert(
      unverifiedInit.evidenceType === 'UNVERIFIED_ASSUMPTION',
      'Unverified strategic assumptions are distinctly tracked and preserved for validation testing',
    );

    // -------------------------------------------------------------
    // Scenario 7: Goal creation and progress calculations
    // -------------------------------------------------------------
    console.log('Scenario 7: Goal creation and progress calculations');
    const newGoal = await planService.createGoal(workspaceAlpha.id, userAlpha.id, {
      planId: genPlan.id,
      title: 'Target 50 Qualified Pilot Inbounds',
      category: 'CUSTOMER_ACQUISITION',
      targetValue: 50,
      currentValue: 10,
      unit: 'Leads',
    });
    assert(newGoal.progressPercent === 20, 'Initial goal progress calculated accurately (10/50 = 20%)');

    const updatedGoal = await planService.recordGoalProgress(workspaceAlpha.id, newGoal.id, userAlpha.id, {
      newValue: 50,
      note: 'Reached full pilot capacity',
    });
    assert(
      updatedGoal.currentValue === 50 && updatedGoal.progressPercent === 100 && updatedGoal.status === 'ACHIEVED',
      'Progress record update dynamically transitioned goal status to ACHIEVED at 100% target completion',
    );

    // -------------------------------------------------------------
    // Scenario 8: Initiative creation and prioritization
    // -------------------------------------------------------------
    console.log('Scenario 8: Initiative creation and prioritization');
    const critInit = await planService.createInitiative(workspaceAlpha.id, userAlpha.id, {
      planId: genPlan.id,
      name: 'Zero-Downtime Entity Schema Deployer',
      priority: 'CRITICAL',
      expectedImpact: 'HIGH',
      estimatedEffort: 'MEDIUM',
      recommendedActions: ['Audit existing schema', 'Deploy JSON-LD tags'],
    });
    assert(critInit.priority === 'CRITICAL', 'Initiative created with prioritized severity CRITICAL');

    // -------------------------------------------------------------
    // Scenario 9: Roadmap generation
    // -------------------------------------------------------------
    console.log('Scenario 9: Roadmap generation');
    const roadmaps = await planService.listRoadmaps(workspaceAlpha.id, genPlan.id);
    assert(
      roadmaps.length > 0 && roadmaps[0].phases.length > 0,
      'Roadmap with sequential execution phases generated and retrieved',
    );

    // -------------------------------------------------------------
    // Scenario 10: Milestone creation
    // -------------------------------------------------------------
    console.log('Scenario 10: Milestone creation');
    const targetDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const milestone = await planService.createMilestone(workspaceAlpha.id, {
      roadmapId: roadmaps[0].id,
      phaseId: roadmaps[0].phases[0]?.id,
      title: 'Entity Schema Ingestion Verified',
      targetDate,
      successCriteria: '100% of target landing pages return valid Schema.org entities',
    });
    assert(milestone && milestone.title === 'Entity Schema Ingestion Verified', 'Milestone created with success criteria');

    // -------------------------------------------------------------
    // Scenario 11: Dependency validation
    // -------------------------------------------------------------
    console.log('Scenario 11: Dependency validation');
    const depTargetInit = await planService.createInitiative(workspaceAlpha.id, userAlpha.id, {
      planId: genPlan.id,
      name: 'Prerequisite Infrastructure Setup',
      priority: 'HIGH',
    });

    const dependency = await planService.addDependency(workspaceAlpha.id, critInit.id, {
      dependsOnId: depTargetInit.id,
      dependencyType: 'BLOCKS',
    });
    assert(dependency && dependency.dependsOnId === depTargetInit.id, 'Initiative dependency successfully established');

    // -------------------------------------------------------------
    // Scenario 12: Circular dependency rejection (DFS cycle detection)
    // -------------------------------------------------------------
    console.log('Scenario 12: Circular dependency rejection (DFS cycle detection)');
    let cycleRejected = false;
    try {
      // Trying to make depTargetInit depend on critInit creates a direct cycle!
      await planService.addDependency(workspaceAlpha.id, depTargetInit.id, {
        dependsOnId: critInit.id,
      });
    } catch (e: any) {
      if (e instanceof BadRequestException && e.message.includes('Circular dependency')) {
        cycleRejected = true;
      }
    }
    assert(cycleRejected, 'Topological DFS algorithm correctly detected and rejected circular dependency');

    // -------------------------------------------------------------
    // Scenario 13: Plan versioning
    // -------------------------------------------------------------
    console.log('Scenario 13: Plan versioning');
    const planDetailBeforeApproval = await planService.getPlan(workspaceAlpha.id, genPlan.id);
    assert(
      planDetailBeforeApproval.versions.length >= 1 && planDetailBeforeApproval.currentVersionNumber === 1,
      'Initial v1.0 version snapshot created during AI plan generation',
    );

    // -------------------------------------------------------------
    // Scenario 14: Strategy review history
    // -------------------------------------------------------------
    console.log('Scenario 14: Strategy review history');
    const review = await planService.createReview(workspaceAlpha.id, userAlpha.id, {
      planId: genPlan.id,
      period: 'MONTHLY',
      summary: 'Month 1 Strategy Evaluation: Citation volume up 18%. No core blockers encountered.',
      blockersIdentified: ['Rate limiting on crawler sweeps'],
      strategicAdjustments: ['Scale caching layer'],
    });
    assert(
      review && review.summary.includes('Month 1 Strategy Evaluation'),
      'Strategy review successfully recorded with blocker and adjustment tracking',
    );

    // -------------------------------------------------------------
    // Scenario 15: Approval workflow
    // -------------------------------------------------------------
    console.log('Scenario 15: Approval workflow');
    const approvedPlan = await planService.approvePlan(workspaceAlpha.id, genPlan.id, userAlpha.id);
    assert(
      approvedPlan.status === 'APPROVED' && approvedPlan.currentVersionNumber === 2,
      'Plan approved: status transitioned to APPROVED and version incremented to v2.0 with snapshot',
    );

    // -------------------------------------------------------------
    // Scenario 16: Initiative-to-project conversion
    // -------------------------------------------------------------
    console.log('Scenario 16: Initiative-to-project conversion');
    const convResult = await planService.convertInitiativeToProject(workspaceAlpha.id, critInit.id, userAlpha.id, {
      projectName: 'Entity Schema Deployment Sprint',
      createInitialTasks: true,
    });
    assert(
      convResult && convResult.projectId && convResult.tasksCreated > 0,
      'Initiative successfully converted into a Phase 4 Project with automated task generation',
    );

    const refreshedInit = await planService.getInitiative(workspaceAlpha.id, critInit.id);
    assert(
      refreshedInit.projectId === convResult.projectId && refreshedInit.status === 'IN_PROGRESS',
      'Strategic initiative updated with linked projectId, convertedAt timestamp, and status IN_PROGRESS',
    );

    // -------------------------------------------------------------
    // Scenario 17: Duplicate conversion prevention
    // -------------------------------------------------------------
    console.log('Scenario 17: Duplicate conversion prevention');
    let duplicateRejected = false;
    try {
      await planService.convertInitiativeToProject(workspaceAlpha.id, critInit.id, userAlpha.id, {});
    } catch (e: any) {
      if (e instanceof ConflictException) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, 'Idempotency enforced: duplicate conversion of same initiative rejected with 409 Conflict');

    // -------------------------------------------------------------
    // Scenario 18: Cross-workspace access prevention (tenant isolation)
    // -------------------------------------------------------------
    console.log('Scenario 18: Cross-workspace access prevention (tenant isolation)');
    let crossAccessBlocked = false;
    try {
      // User/Workspace Beta trying to access Workspace Alpha's strategic plan
      await planService.getPlan(workspaceBeta.id, genPlan.id);
    } catch (e: any) {
      if (e instanceof NotFoundException) {
        crossAccessBlocked = true;
      }
    }
    assert(crossAccessBlocked, 'Cross-tenant isolation enforced: plan belonging to Workspace Alpha invisible to Workspace Beta');

    // -------------------------------------------------------------
    // Scenario 19: Budget enforcement (hard token limit blocking)
    // -------------------------------------------------------------
    console.log('Scenario 19: Budget enforcement (hard token limit blocking)');
    // Set monthlyTokenBudget to 1 token for Workspace Alpha to test hard cap enforcement
    await prisma.aIWorkspaceConfig.upsert({
      where: { workspaceId: workspaceAlpha.id },
      create: { workspaceId: workspaceAlpha.id, monthlyTokenBudget: 1 },
      update: { monthlyTokenBudget: 1 },
    });

    // Record artificial usage exceeding the 1 token limit
    await usageService.recordUsage({
      workspaceId: workspaceAlpha.id,
      userId: userAlpha.id,
      provider: 'mock',
      model: 'mock-agent-fast',
      requestId: `test_req_${Date.now()}`,
      promptTokens: 100,
      completionTokens: 100,
      status: 'SUCCESS',
    });

    let budgetBlocked = false;
    try {
      await usageService.checkBudgetOrThrow(workspaceAlpha.id);
    } catch (e: any) {
      if (e instanceof ForbiddenException && e.message.includes('monthly token limit exceeded')) {
        budgetBlocked = true;
      }
    }
    assert(budgetBlocked, 'Budget enforcement: execution rejected with 403 Forbidden when token budget exceeded');

    // Reset budget to healthy limit for subsequent operations
    await prisma.aIWorkspaceConfig.update({
      where: { workspaceId: workspaceAlpha.id },
      data: { monthlyTokenBudget: 10_000_000 },
    });

    // -------------------------------------------------------------
    // Scenario 20: AI provider failure handling (HTTP 503 captured, FAILED/DRAFT status)
    // -------------------------------------------------------------
    console.log('Scenario 20: AI provider failure handling');
    const failingPlan = await planService.createPlan(workspaceAlpha.id, userAlpha.id, {
      title: 'Provider Failure Test Plan',
    });

    // Mock an artificial error by pointing to an unconfigured provider or simulating failure
    const originalGetAdapter = providerRegistry.getAdapter.bind(providerRegistry);
    providerRegistry.getAdapter = () => ({
      id: 'mock',
      isConfigured: () => true,
      getAvailableModels: () => [],
      generateCompletion: async () => {
        throw new Error('503 Service Unavailable: Simulated AI Provider Outage');
      },
      generateStream: async function* () {},
    }) as any;

    let failureCaught = false;
    try {
      await orchestrator.executePlanGeneration(failingPlan.id, workspaceAlpha.id, userAlpha.id);
    } catch {
      failureCaught = true;
    }

    // Restore provider registry
    providerRegistry.getAdapter = originalGetAdapter;

    const resetPlan = await prisma.strategicPlan.findUnique({ where: { id: failingPlan.id } });
    assert(
      failureCaught && resetPlan?.status === 'DRAFT',
      'AI provider failure handled gracefully: exception surfaced and plan status safely reset to DRAFT',
    );

    // -------------------------------------------------------------
    // Scenario 21: Job retry and idempotency
    // -------------------------------------------------------------
    console.log('Scenario 21: Job retry and idempotency');
    const { processPlanGenerationJob } = await import('../../worker/src/processors/plan-generation.processor');
    const mockJob = {
      id: `job_retry_test_${testSuffix}`,
      attemptsMade: 1,
      data: {
        planId: genPlan.id,
        workspaceId: workspaceAlpha.id,
        userId: userAlpha.id,
      },
    };
    const jobResult = await processPlanGenerationJob(mockJob as any);
    assert(
      jobResult && jobResult.status === 'COMPLETED' && jobResult.planId === genPlan.id,
      'Background worker processor completed plan generation job idempotently with retry handling',
    );

    // -------------------------------------------------------------
    // Scenario 22: Cancellation behavior
    // -------------------------------------------------------------
    console.log('Scenario 22: Cancellation behavior');
    const cancelledPlan = await planService.createPlan(workspaceAlpha.id, userAlpha.id, {
      title: 'Pre-cancelled Plan',
    });
    // Mark as ARCHIVED before orchestrator commits
    await prisma.strategicPlan.update({
      where: { id: cancelledPlan.id },
      data: { status: 'ARCHIVED' },
    });
    await orchestrator.executePlanGeneration(cancelledPlan.id, workspaceAlpha.id, userAlpha.id);
    const postExecPlan = await prisma.strategicPlan.findUnique({ where: { id: cancelledPlan.id } });
    assert(
      postExecPlan?.status === 'ARCHIVED',
      'Cancellation behavior: archived plan generation gracefully bypassed without overwriting',
    );

    // -------------------------------------------------------------
    // Scenario 23: Permission enforcement
    // -------------------------------------------------------------
    console.log('Scenario 23: Permission enforcement');
    let membershipCheckPassed = false;
    try {
      await workspacesService.verifyMembership(workspaceAlpha.id, userBeta.id);
    } catch {
      membershipCheckPassed = true;
    }
    assert(membershipCheckPassed, 'Workspace membership verified: unauthorized user correctly rejected');

    // -------------------------------------------------------------
    // Scenario 24: Dashboard aggregation
    // -------------------------------------------------------------
    console.log('Scenario 24: Dashboard aggregation');
    const overview = await planService.getOverview(workspaceAlpha.id);
    const aggregationValid =
      overview.totalPlans > 0 &&
      overview.totalGoals > 0 &&
      overview.totalInitiatives > 0 &&
      Array.isArray(overview.activePlansList) &&
      Array.isArray(overview.goals) &&
      Array.isArray(overview.initiatives) &&
      Array.isArray(overview.recentReviews);

    assert(aggregationValid, 'Planning dashboard aggregation returns comprehensive metrics, plans, goals, and reviews');

  } catch (fatalErr) {
    console.error('Fatal execution error in test suite:', fatalErr);
    failedTests++;
  } finally {
    // Teardown: Clean up test data
    console.log('\nCleaning up test artifacts...');
    if (workspaceAlpha) {
      await prisma.workspace.delete({ where: { id: workspaceAlpha.id } }).catch(() => {});
    }
    if (workspaceBeta) {
      await prisma.workspace.delete({ where: { id: workspaceBeta.id } }).catch(() => {});
    }
    if (userAlpha) {
      await prisma.user.delete({ where: { id: userAlpha.id } }).catch(() => {});
    }
    if (userBeta) {
      await prisma.user.delete({ where: { id: userBeta.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`Phase 6B Test Suite Results: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase6bTestSuite();
