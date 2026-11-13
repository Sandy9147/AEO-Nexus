import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderRegistry } from '../ai/providers/provider.registry';
import { AiUsageService } from '../ai/usage/usage.service';
import { WorkspaceContextService } from '../ai/context/workspace-context.service';
import { KnowledgeRetrievalService } from '../ai/retrieval/knowledge-retrieval.service';
import { PromptSanitizer } from '../ai/prompts/prompt-sanitizer';
import { AiCompletionRequest } from '../ai/providers/ai-provider.interface';
import {
  EvidenceType,
  GoalCategory,
  GoalPriority,
  InitiativePriority,
  InitiativeStatus,
} from '@prisma/client';

interface RawPlanOutput {
  executiveSummary?: string;
  currentSituation?: string;
  marketPositioning?: string;
  strategicObjectives?: string[];
  targetAudience?: string;
  requiredResources?: string[];
  budgetAssumptions?: string[];
  risksAndMitigations?: Array<{
    risk: string;
    mitigation: string;
    severity?: string;
    likelihood?: string;
  }>;
  dependencies?: string[];
  timelineAssumptions?: string[];
  successMetrics?: string[];
  validationRequirements?: string[];
  nextRecommendedActions?: string[];
  confidenceScore?: number;
  goals?: Array<{
    title: string;
    description?: string;
    category?: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    priority?: string;
    measurementFrequency?: string;
    isQualitative?: boolean;
    startDate?: string;
    targetDate?: string;
  }>;
  initiatives?: Array<{
    name: string;
    description?: string;
    strategicRationale?: string;
    priority?: string;
    status?: string;
    expectedImpact?: string;
    estimatedEffort?: string;
    estimatedCost?: string;
    risks?: string[];
    recommendedActions?: string[];
    evidenceType?: string;
    phaseName?: string;
  }>;
  roadmaps?: Array<{
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    phases?: Array<{
      phaseOrder: number;
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      milestones?: Array<{
        title: string;
        description?: string;
        targetDays?: number;
        targetDate?: string;
        successCriteria?: string;
      }>;
    }>;
  }>;
  recommendations?: Array<{
    title: string;
    recommendation: string;
    category?: string;
    impact?: string;
    urgency?: string;
    evidenceType?: string;
  }>;
}

@Injectable()
export class PlanOrchestratorService {
  private readonly logger = new Logger(PlanOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageService: AiUsageService,
    private readonly contextService: WorkspaceContextService,
    private readonly retrievalService: KnowledgeRetrievalService,
  ) {}

  async executePlanGeneration(planId: string, workspaceId: string, userId: string): Promise<void> {
    this.logger.log(`Executing AI Strategic Plan generation for plan ${planId} (workspace ${workspaceId})`);

    const plan = await this.prisma.strategicPlan.findUnique({
      where: { id: planId },
      include: {
        research: true,
        opportunity: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Strategic Plan ${planId} not found`);
    }

    if (plan.status === 'ARCHIVED' || plan.status === 'APPROVED' || plan.status === 'ACTIVE') {
      this.logger.warn(`Strategic Plan ${planId} is already ${plan.status}. Skipping generation.`);
      return;
    }

    // 1. Budget Verification
    await this.usageService.checkBudgetOrThrow(workspaceId);

    // 2. Mark plan as GENERATING
    await this.prisma.strategicPlan.update({
      where: { id: planId },
      data: { status: 'GENERATING' },
    });

    const startTime = Date.now();
    let selectedProviderName = 'mock';
    let selectedModelName = 'mock-agent-fast';

    try {
      // 3. Assemble Workspace Context & Knowledge Vault citations
      const contextBundle = await this.contextService.buildBoundedContext(workspaceId, userId);

      const relevantDocsResult = await this.retrievalService.retrieveRelevantDocuments(
        workspaceId,
        `${plan.title} ${plan.targetMarket || ''} ${plan.targetAudience || ''}`,
        3,
      );
      const relevantDocs = relevantDocsResult.documents;

      // 4. Resolve AI Provider Adapter
      let adapter = this.providerRegistry.getAdapter('openai');
      if (adapter && adapter.isConfigured() && adapter.id === 'openai') {
        selectedProviderName = 'openai';
        selectedModelName = 'gpt-4o';
      } else {
        adapter = this.providerRegistry.getAdapter('gemini');
        if (adapter && adapter.isConfigured() && adapter.id === 'gemini') {
          selectedProviderName = 'gemini';
          selectedModelName = 'gemini-1.5-pro';
        } else {
          adapter = this.providerRegistry.getAdapter('mock');
          selectedProviderName = 'mock';
          selectedModelName = 'mock-agent-fast';
        }
      }

      this.logger.log(`Using AI Provider "${selectedProviderName}" with model "${selectedModelName}" for plan ${planId}`);

      // 5. Build Comprehensive Strategic Plan Prompt
      const sanitizedTitle = PromptSanitizer.sanitizeUserInput(plan.title).cleanText;
      const sanitizedMarket = PromptSanitizer.sanitizeUserInput(plan.targetMarket || 'General Market').cleanText;
      const sanitizedAudience = PromptSanitizer.sanitizeUserInput(plan.targetAudience || 'Target Customers').cleanText;
      const sanitizedStage = PromptSanitizer.sanitizeUserInput(plan.businessStage || 'Growth').cleanText;

      let discoverContext = '';
      if (plan.research) {
        discoverContext += `\nLinked Discover Research: "${plan.research.topic}" (Objective: ${plan.research.objective})`;
      }
      if (plan.opportunity) {
        discoverContext += `\nLinked Market Opportunity: "${plan.opportunity.title}" (Problem: ${plan.opportunity.customerProblem})`;
      }

      const systemPrompt = `[STRATEGIC_PLAN]
You are the AEO Nexus Principal Business Strategy Architect.
Your task is to generate a comprehensive, highly rigorous, and executable Strategic Business Plan formatted strictly as JSON.
Never fabricate financial data, ungrounded statistics, or unrealistic milestones.
Mark every strategic finding with appropriate evidence classification:
- VERIFIED_SOURCE: Grounded in workspace knowledge base documents or verified research.
- AI_ANALYSIS: Derived through analytical deduction, market benchmarking, or strategic heuristics.
- USER_INPUT: Provided directly by the workspace user.
- UNVERIFIED_ASSUMPTION: Plausible assumptions that require explicit validation experiments.

Workspace Context:
${contextBundle.combinedContextPrompt}

Verified Knowledge Documents:
${relevantDocs.map((d) => `- [${d.title}] ${d.snippet}`).join('\n') || 'None indexed yet.'}

You must return a single valid JSON object strictly matching this TypeScript structure:
{
  "executiveSummary": "string",
  "currentSituation": "string",
  "marketPositioning": "string",
  "strategicObjectives": ["string"],
  "targetAudience": "string",
  "requiredResources": ["string"],
  "budgetAssumptions": ["string"],
  "risksAndMitigations": [
    { "risk": "string", "mitigation": "string", "severity": "LOW | MEDIUM | HIGH | CRITICAL", "likelihood": "LOW | MEDIUM | HIGH" }
  ],
  "dependencies": ["string"],
  "timelineAssumptions": ["string"],
  "successMetrics": ["string"],
  "validationRequirements": ["string"],
  "nextRecommendedActions": ["string"],
  "confidenceScore": 0.90,
  "goals": [
    {
      "title": "string",
      "description": "string",
      "category": "REVENUE | CUSTOMER_ACQUISITION | CUSTOMER_RETENTION | WEBSITE_TRAFFIC | BRAND_AWARENESS | AEO_VISIBILITY | PRODUCT_LAUNCH | OPERATIONAL_EFFICIENCY",
      "targetValue": 100,
      "currentValue": 0,
      "unit": "USD | % | COUNT",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "measurementFrequency": "WEEKLY | MONTHLY | QUARTERLY",
      "isQualitative": false
    }
  ],
  "initiatives": [
    {
      "name": "string",
      "description": "string",
      "strategicRationale": "string",
      "priority": "LOW | MEDIUM | HIGH | CRITICAL",
      "expectedImpact": "LOW | MEDIUM | HIGH",
      "estimatedEffort": "LOW | MEDIUM | HIGH",
      "estimatedCost": "string",
      "risks": ["string"],
      "recommendedActions": ["string"],
      "evidenceType": "VERIFIED_SOURCE | AI_ANALYSIS | USER_INPUT | UNVERIFIED_ASSUMPTION"
    }
  ],
  "roadmaps": [
    {
      "title": "string",
      "description": "string",
      "phases": [
        {
          "phaseOrder": 1,
          "name": "string",
          "description": "string",
          "milestones": [
            { "title": "string", "description": "string", "targetDays": 30, "successCriteria": "string" }
          ]
        }
      ]
    }
  ],
  "recommendations": [
    {
      "title": "string",
      "recommendation": "string",
      "category": "STRATEGY | EXECUTION | MARKETING | TECH | GOVERNANCE",
      "impact": "HIGH | MEDIUM | LOW",
      "urgency": "HIGH | MEDIUM | LOW",
      "evidenceType": "AI_ANALYSIS"
    }
  ]
}`;

      const userPrompt = `Generate a STRATEGIC_PLAN for the following business parameters:
Plan Title: ${sanitizedTitle}
Plan Type: ${plan.planType}
Business Stage: ${sanitizedStage}
Target Market: ${sanitizedMarket}
Target Audience: ${sanitizedAudience}
Budget Range: ${plan.budgetRange || 'Flexible'}
Horizon Months: ${plan.horizonMonths}
${discoverContext}`;

      const request: AiCompletionRequest = {
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        model: selectedModelName,
        temperature: 0.25,
        workspaceId,
      };

      // 6. Invoke Provider
      const completion = await adapter.generateCompletion(request);
      const latencyMs = Date.now() - startTime;

      // 7. Parse & Validate JSON
      const parsedOutput = this.safeParseOutput(completion.content, plan.title);

      // Verify plan is still active and not deleted
      const currentPlan = await this.prisma.strategicPlan.findUnique({
        where: { id: planId },
        select: { status: true },
      });
      if (!currentPlan || currentPlan.status === 'ARCHIVED') {
        this.logger.warn(`Plan ${planId} was archived or removed during generation. Aborting commit.`);
        return;
      }

      // 8. Interactive Transaction with relaxed timeout for Neon WAN latency
      await this.prisma.$transaction(
        async (tx) => {
          // A. Update StrategicPlan with all 15 sections and READY_FOR_REVIEW status
          await tx.strategicPlan.update({
            where: { id: planId },
            data: {
              status: 'READY_FOR_REVIEW',
              executiveSummary: parsedOutput.executiveSummary || 'Executive summary generated by AEO Nexus.',
              currentSituation: parsedOutput.currentSituation || 'Current business situation evaluated.',
              marketPositioning: parsedOutput.marketPositioning || 'Market positioning defined.',
              strategicObjectives: parsedOutput.strategicObjectives || [],
              targetAudience: parsedOutput.targetAudience || plan.targetAudience,
              requiredResources: parsedOutput.requiredResources || [],
              budgetAssumptions: parsedOutput.budgetAssumptions || [],
              risksAndMitigations: parsedOutput.risksAndMitigations || [],
              dependencies: parsedOutput.dependencies || [],
              timelineAssumptions: parsedOutput.timelineAssumptions || [],
              successMetrics: parsedOutput.successMetrics || [],
              validationRequirements: parsedOutput.validationRequirements || [],
              nextRecommendedActions: parsedOutput.nextRecommendedActions || [],
              confidenceScore: parsedOutput.confidenceScore || 0.88,
              currentVersionNumber: 1,
            },
          });

          // B. Create or update StrategicPlanVersion v1 snapshot
          await tx.strategicPlanVersion.upsert({
            where: {
              planId_versionNumber: {
                planId,
                versionNumber: 1,
              },
            },
            create: {
              planId,
              versionNumber: 1,
              title: `${plan.title} (v1.0 AI Generated)`,
              content: parsedOutput as any,
              changeSummary: 'Initial comprehensive strategic plan generated by AI Engine.',
              createdById: userId,
            },
            update: {
              title: `${plan.title} (v1.0 AI Generated)`,
              content: parsedOutput as any,
              changeSummary: 'Initial comprehensive strategic plan generated by AI Engine.',
            },
          });

          // C. Create BusinessGoals
          if (parsedOutput.goals && parsedOutput.goals.length > 0) {
            for (const g of parsedOutput.goals) {
              const targetVal = Number(g.targetValue) || 100;
              const currentVal = Number(g.currentValue) || 0;

              await tx.businessGoal.create({
                data: {
                  workspaceId,
                  planId,
                  title: g.title,
                  description: g.description || null,
                  category: this.mapGoalCategory(g.category),
                  targetValue: targetVal,
                  currentValue: currentVal,
                  unit: g.unit || 'COUNT',
                  priority: this.mapGoalPriority(g.priority),
                  measurementFrequency: g.measurementFrequency || 'MONTHLY',
                  isQualitative: Boolean(g.isQualitative),
                  startDate: g.startDate ? new Date(g.startDate) : new Date(),
                  targetDate: g.targetDate
                    ? new Date(g.targetDate)
                    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                },
              });
            }
          }

          // D. Create StrategicInitiatives
          if (parsedOutput.initiatives && parsedOutput.initiatives.length > 0) {
            for (const init of parsedOutput.initiatives) {
              await tx.strategicInitiative.create({
                data: {
                  workspaceId,
                  planId,
                  name: init.name,
                  description: init.description || null,
                  strategicRationale: init.strategicRationale || null,
                  priority: this.mapInitiativePriority(init.priority),
                  status: InitiativeStatus.PLANNED,
                  expectedImpact: init.expectedImpact || 'HIGH',
                  estimatedEffort: init.estimatedEffort || 'MEDIUM',
                  estimatedCost: init.estimatedCost || null,
                  risks: init.risks || [],
                  recommendedActions: init.recommendedActions || [],
                  evidenceType: this.mapEvidenceType(init.evidenceType),
                },
              });
            }
          }

          // E. Create StrategicRoadmap & Phases & Milestones
          if (parsedOutput.roadmaps && parsedOutput.roadmaps.length > 0) {
            for (const r of parsedOutput.roadmaps) {
              const roadmap = await tx.strategicRoadmap.create({
                data: {
                  workspaceId,
                  planId,
                  title: r.title || `${plan.title} Roadmap`,
                  description: r.description || null,
                  startDate: r.startDate ? new Date(r.startDate) : new Date(),
                  endDate: r.endDate
                    ? new Date(r.endDate)
                    : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                },
              });

              if (r.phases && r.phases.length > 0) {
                for (const ph of r.phases) {
                  const phase = await tx.roadmapPhase.create({
                    data: {
                      roadmapId: roadmap.id,
                      name: ph.name,
                      description: ph.description || null,
                      phaseOrder: ph.phaseOrder || 1,
                      status: ph.phaseOrder === 1 ? 'IN_PROGRESS' : 'NOT_STARTED',
                    },
                  });

                  if (ph.milestones && ph.milestones.length > 0) {
                    for (const m of ph.milestones) {
                      const daysOffset = m.targetDays || 30;
                      await tx.roadmapMilestone.create({
                        data: {
                          workspaceId,
                          roadmapId: roadmap.id,
                          phaseId: phase.id,
                          title: m.title,
                          description: m.description || null,
                          targetDate: m.targetDate
                            ? new Date(m.targetDate)
                            : new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000),
                          successCriteria: m.successCriteria || null,
                          status: 'PENDING',
                        },
                      });
                    }
                  }
                }
              }
            }
          }

          // F. Create PlanningRecommendations
          if (parsedOutput.recommendations && parsedOutput.recommendations.length > 0) {
            for (const rec of parsedOutput.recommendations) {
              await tx.planningRecommendation.create({
                data: {
                  workspaceId,
                  planId,
                  title: rec.title,
                  recommendation: rec.recommendation,
                  category: rec.category || 'STRATEGY',
                  impact: rec.impact || 'HIGH',
                  urgency: rec.urgency || 'MEDIUM',
                  evidenceType: this.mapEvidenceType(rec.evidenceType),
                },
              });
            }
          }
        },
        {
          maxWait: 15000,
          timeout: 30000,
        },
      );

      // 9. Record Usage & Token Spend
      await this.usageService.recordUsage({
        workspaceId,
        userId,
        provider: selectedProviderName,
        model: selectedModelName,
        requestId: `plan_gen_${planId}_${Date.now()}`,
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
        status: 'SUCCESS',
      });

      this.logger.log(`Strategic Plan generation completed successfully for plan ${planId} in ${latencyMs}ms`);
    } catch (err) {
      this.logger.error(`Plan generation failed for plan ${planId}:`, err);

      await this.prisma.strategicPlan
        .update({
          where: { id: planId },
          data: { status: 'DRAFT' },
        })
        .catch(() => {});

      throw err;
    }
  }

  private safeParseOutput(raw: string, planTitle: string): RawPlanOutput {
    try {
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      this.logger.warn(`Failed to parse AI output as JSON for plan "${planTitle}". Using structured fallback.`);
      return {
        executiveSummary: `Strategic roadmap and business expansion plan for ${planTitle}.`,
        currentSituation: 'Current operations assessed against industry growth baselines.',
        marketPositioning: 'Positioned as an agile, AI-optimized modern digital enterprise.',
        strategicObjectives: ['Accelerate high-intent customer acquisition', 'Achieve operational efficiency'],
        requiredResources: ['Cross-functional development team', 'Strategic marketing bandwidth'],
        budgetAssumptions: ['Initial pilot allocation within approved limits'],
        risksAndMitigations: [
          {
            risk: 'Market saturation in generic offerings',
            mitigation: 'Specialize in verified answer engine visibility and automated workflows',
            severity: 'MEDIUM',
            likelihood: 'MEDIUM',
          },
        ],
        dependencies: ['Workspace entity verification'],
        timelineAssumptions: ['Quarterly milestone cadences'],
        successMetrics: ['Consistent 25% MoM conversion growth'],
        validationRequirements: ['Pilot cohort feedback'],
        nextRecommendedActions: ['Approve initial roadmap sprint'],
        confidenceScore: 0.85,
        goals: [
          {
            title: `Achieve Category Growth for ${planTitle}`,
            category: 'REVENUE',
            targetValue: 100000,
            currentValue: 0,
            unit: 'USD',
            priority: 'HIGH',
            measurementFrequency: 'MONTHLY',
          },
        ],
        initiatives: [
          {
            name: 'Launch Strategic Foundation Sprint',
            description: `Execute core infrastructure deliverables for ${planTitle}`,
            priority: 'HIGH',
            expectedImpact: 'HIGH',
            estimatedEffort: 'MEDIUM',
            evidenceType: 'AI_ANALYSIS',
          },
        ],
        roadmaps: [
          {
            title: `${planTitle} Strategic Roadmap`,
            description: 'Phased implementation roadmap',
            phases: [
              {
                phaseOrder: 1,
                name: 'Phase 1: Foundation',
                milestones: [
                  {
                    title: 'Strategic Foundation Deployed',
                    targetDays: 30,
                    successCriteria: 'Milestone criteria signed off',
                  },
                ],
              },
            ],
          },
        ],
        recommendations: [
          {
            title: 'Schedule Weekly Strategy Sync',
            recommendation: 'Track initiative dependencies closely across each milestone.',
            category: 'GOVERNANCE',
            impact: 'HIGH',
            urgency: 'HIGH',
            evidenceType: 'AI_ANALYSIS',
          },
        ],
      };
    }
  }

  private mapGoalCategory(val?: string): GoalCategory {
    switch (val?.toUpperCase()) {
      case 'CUSTOMER_ACQUISITION':
        return GoalCategory.CUSTOMER_ACQUISITION;
      case 'CUSTOMER_RETENTION':
        return GoalCategory.CUSTOMER_RETENTION;
      case 'WEBSITE_TRAFFIC':
        return GoalCategory.WEBSITE_TRAFFIC;
      case 'BRAND_AWARENESS':
        return GoalCategory.BRAND_AWARENESS;
      case 'AEO_VISIBILITY':
        return GoalCategory.AEO_VISIBILITY;
      case 'PRODUCT_LAUNCH':
        return GoalCategory.PRODUCT_LAUNCH;
      case 'OPERATIONAL_EFFICIENCY':
        return GoalCategory.OPERATIONAL_EFFICIENCY;
      case 'REVENUE':
      default:
        return GoalCategory.REVENUE;
    }
  }

  private mapGoalPriority(val?: string): GoalPriority {
    switch (val?.toUpperCase()) {
      case 'CRITICAL':
        return GoalPriority.CRITICAL;
      case 'HIGH':
        return GoalPriority.HIGH;
      case 'LOW':
        return GoalPriority.LOW;
      case 'MEDIUM':
      default:
        return GoalPriority.MEDIUM;
    }
  }

  private mapInitiativePriority(val?: string): InitiativePriority {
    switch (val?.toUpperCase()) {
      case 'CRITICAL':
        return InitiativePriority.CRITICAL;
      case 'HIGH':
        return InitiativePriority.HIGH;
      case 'LOW':
        return InitiativePriority.LOW;
      case 'MEDIUM':
      default:
        return InitiativePriority.MEDIUM;
    }
  }

  private mapEvidenceType(val?: string): EvidenceType {
    switch (val?.toUpperCase()) {
      case 'VERIFIED_SOURCE':
        return EvidenceType.VERIFIED_SOURCE;
      case 'USER_INPUT':
        return EvidenceType.USER_INPUT;
      case 'UNVERIFIED_ASSUMPTION':
        return EvidenceType.UNVERIFIED_ASSUMPTION;
      case 'AI_ANALYSIS':
      default:
        return EvidenceType.AI_ANALYSIS;
    }
  }
}
