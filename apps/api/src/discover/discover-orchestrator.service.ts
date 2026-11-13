import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderRegistry } from '../ai/providers/provider.registry';
import { AiUsageService } from '../ai/usage/usage.service';
import { WorkspaceContextService } from '../ai/context/workspace-context.service';
import { KnowledgeRetrievalService } from '../ai/retrieval/knowledge-retrieval.service';
import { PromptSanitizer } from '../ai/prompts/prompt-sanitizer';
import { AiCompletionRequest } from '../ai/providers/ai-provider.interface';
import { EvidenceType, ConfidenceLevel, SourceType } from '@prisma/client';

interface RawResearchOutput {
  executiveSummary?: string;
  methodology?: string;
  confidenceScore?: number;
  findings?: Array<{
    category: string;
    title: string;
    description: string;
    evidenceType?: string;
    confidenceLevel?: string;
    evidenceDetails?: string;
    risks?: string;
    recommendations?: string;
  }>;
  opportunities?: Array<{
    title: string;
    description: string;
    customerProblem: string;
    marketDemandEvidence: string;
    competitionAnalysis?: string;
    differentiation: string;
    businessFeasibility?: string;
    potentialBusinessModel?: string;
    assumptions?: string[];
    risks?: string[];
    confidenceLevel?: string;
    suggestedExperiment: string;
    evidenceType?: string;
  }>;
  competitors?: Array<{
    name: string;
    website?: string;
    industry?: string;
    description?: string;
    productsServices?: string;
    positioning?: string;
    pricingObservations?: string;
    contentObservations?: string;
    strengths?: string[];
    weaknesses?: string[];
    differentiationOpportunities?: string;
    evidenceType?: string;
    isVerified?: boolean;
  }>;
  audienceProfiles?: Array<{
    segmentName: string;
    isAiGenerated?: boolean;
    idealCustomerProfile?: string;
    demographics?: string;
    painPoints?: string[];
    needs?: string[];
    buyingMotivations?: string[];
    objections?: string[];
    customerJourney?: any;
  }>;
  sources?: Array<{
    title: string;
    url?: string;
    sourceType?: string;
    publicationDate?: string;
    snippet?: string;
    isVerified?: boolean;
  }>;
  aeoQuestions?: Array<{
    topic: string;
    queryQuestion: string;
    targetIndustry?: string;
    expectedPersona?: string;
    brandMentioned?: boolean;
    brandRank?: number;
    brandSentiment?: string;
    competitorsMentioned?: string[];
    citations?: any[];
    rawAnswerExcerpt?: string;
    isActualMeasurement?: boolean;
  }>;
}

@Injectable()
export class DiscoverOrchestratorService {
  private readonly logger = new Logger(DiscoverOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageService: AiUsageService,
    private readonly contextService: WorkspaceContextService,
    private readonly retrievalService: KnowledgeRetrievalService,
  ) {}

  async executeResearch(researchId: string, workspaceId: string, userId: string): Promise<void> {
    this.logger.log(`Executing Discover Research project ${researchId} for workspace ${workspaceId}`);

    const project = await this.prisma.researchProject.findUnique({
      where: { id: researchId },
    });

    if (!project) {
      throw new NotFoundException(`Research project ${researchId} not found`);
    }

    if (project.status === 'CANCELLED' || project.status === 'COMPLETED') {
      this.logger.warn(`Research project ${researchId} is already ${project.status}. Skipping execution.`);
      return;
    }

    // 1. Budget Verification
    await this.usageService.checkBudgetOrThrow(workspaceId);

    // 2. Mark project as RUNNING
    await this.prisma.researchProject.update({
      where: { id: researchId },
      data: { status: 'RUNNING' },
    });

    const startTime = Date.now();
    let selectedProviderName = 'mock';
    let selectedModelName = 'mock-agent-fast';

    try {
      // 3. Load workspace AI config
      const config = await this.prisma.aIWorkspaceConfig.findUnique({
        where: { workspaceId },
      });

      if (config) {
        selectedProviderName = config.defaultProvider;
        selectedModelName = config.defaultModel;
      }

      // Check if selected provider is configured, otherwise fallback to mock
      const adapter = this.providerRegistry.getAdapter(selectedProviderName);
      selectedProviderName = adapter.id;
      selectedModelName = adapter.getAvailableModels()[0]?.id || selectedModelName;

      // 4. Retrieve bounded workspace context & published knowledge vault
      const contextObj = await this.contextService.buildBoundedContext(workspaceId, userId);
      const workspaceContext = contextObj.combinedContextPrompt;

      const retrievedKnowledge = await this.retrievalService.retrieveRelevantDocuments(
        workspaceId,
        `${project.topic} ${project.industry || ''} ${project.objective}`,
      );

      const knowledgeVaultContext = retrievedKnowledge.documents.length > 0
        ? PromptSanitizer.formatSecureKnowledgeContext(retrievedKnowledge.documents)
        : '';

      // 5. Build strict JSON output system prompt
      const systemPrompt = `You are the AEO Nexus Discover Research & Opportunity Intelligence Engine.
SYSTEM DIRECTIVE: DISCOVER_RESEARCH
You are performing structured business, competitive, audience, and Answer Engine Optimization (AEO) research for a verified workspace.

CONTEXTUAL AWARENESS:
Workspace Context:
${workspaceContext}

${knowledgeVaultContext}

CRITICAL RESEARCH RULES & GOVERNANCE:
1. Always distinguish between:
   - VERIFIED_SOURCE: Facts with real verified source links or citations.
   - AI_ANALYSIS: Structured analysis and deductions synthesized by AI.
   - USER_INPUT: Information explicitly supplied by user.
   - UNVERIFIED_ASSUMPTION: Speculative projections requiring validation.
2. NEVER invent competitor revenue, traffic, financial information, or fake market sizes.
3. Every market opportunity MUST include customer problem, market demand evidence, differentiation, assumptions, risks, and a concrete suggested validation experiment.
4. Clearly identify customer audience personas as AI-generated (isAiGenerated: true).
5. Never claim live AI search visibility measurements unless actual measurements are collected (isActualMeasurement: false).
6. Return your output STRICTLY as a valid JSON object matching the schema below without conversational filler or Markdown wrapping.

JSON Output Schema:
{
  "executiveSummary": "string",
  "methodology": "string",
  "confidenceScore": 0.85,
  "findings": [
    {
      "category": "MARKET_DEMAND | COMPETITIVE_LANDSCAPE | CUSTOMER_PAIN | PRICING | TREND | THREAT | AEO_VISIBILITY",
      "title": "string",
      "description": "string",
      "evidenceType": "VERIFIED_SOURCE | AI_ANALYSIS | USER_INPUT | UNVERIFIED_ASSUMPTION",
      "confidenceLevel": "HIGH | MEDIUM | LOW | SPECULATIVE",
      "evidenceDetails": "string",
      "risks": "string",
      "recommendations": "string"
    }
  ],
  "opportunities": [
    {
      "title": "string",
      "description": "string",
      "customerProblem": "string",
      "marketDemandEvidence": "string",
      "competitionAnalysis": "string",
      "differentiation": "string",
      "businessFeasibility": "string",
      "potentialBusinessModel": "string",
      "assumptions": ["string"],
      "risks": ["string"],
      "confidenceLevel": "HIGH | MEDIUM | LOW | SPECULATIVE",
      "suggestedExperiment": "string",
      "evidenceType": "AI_ANALYSIS"
    }
  ],
  "competitors": [
    {
      "name": "string",
      "website": "string",
      "industry": "string",
      "description": "string",
      "productsServices": "string",
      "positioning": "string",
      "pricingObservations": "string",
      "contentObservations": "string",
      "strengths": ["string"],
      "weaknesses": ["string"],
      "differentiationOpportunities": "string",
      "evidenceType": "AI_ANALYSIS",
      "isVerified": false
    }
  ],
  "audienceProfiles": [
    {
      "segmentName": "string",
      "isAiGenerated": true,
      "idealCustomerProfile": "string",
      "demographics": "string",
      "painPoints": ["string"],
      "needs": ["string"],
      "buyingMotivations": ["string"],
      "objections": ["string"],
      "customerJourney": {
        "awareness": ["string"],
        "consideration": ["string"],
        "decision": ["string"]
      }
    }
  ],
  "sources": [
    {
      "title": "string",
      "url": "string",
      "sourceType": "KNOWLEDGE_VAULT | WEB_SEARCH | INDUSTRY_REPORT | USER_DOCUMENT | OFFLINE_KNOWLEDGE",
      "publicationDate": "string",
      "snippet": "string",
      "isVerified": boolean
    }
  ],
  "aeoQuestions": [
    {
      "topic": "string",
      "queryQuestion": "string",
      "targetIndustry": "string",
      "expectedPersona": "string",
      "brandMentioned": boolean,
      "brandRank": 1,
      "brandSentiment": "POSITIVE | NEUTRAL | NEGATIVE",
      "competitorsMentioned": ["string"],
      "citations": [{ "title": "string", "url": "string", "snippet": "string" }],
      "rawAnswerExcerpt": "string",
      "isActualMeasurement": false
    }
  ]
}`;

      const userPrompt = `Conduct comprehensive research on:
Research Topic: ${project.topic}
Industry: ${project.industry || 'General Business'}
Target Country: ${project.targetCountry || 'Global'}
Target Audience: ${project.targetAudience || 'Business Customers'}
Business Description: ${project.businessDescription || 'Not specified'}
Objective: ${project.objective}
Please synthesize findings, market opportunities, competitors, customer profiles, sources, and AEO questions.`;

      const request: AiCompletionRequest = {
        messages: [{ role: 'user', content: userPrompt }],
        systemPrompt,
        model: selectedModelName,
        temperature: 0.3,
        workspaceId,
      };

      // 6. Invoke Provider
      const completion = await adapter.generateCompletion(request);
      const latencyMs = Date.now() - startTime;

      // 7. Parse & Validate JSON
      const parsedOutput = this.safeParseOutput(completion.content, project.topic);

      // Verify project is still active and not cancelled before persisting
      const currentProject = await this.prisma.researchProject.findUnique({
        where: { id: researchId },
        select: { status: true },
      });
      if (!currentProject || currentProject.status === 'CANCELLED') {
        this.logger.warn(`Project ${researchId} was cancelled or removed during generation. Aborting commit.`);
        return;
      }

      // 8. Persist findings in transaction
      await this.prisma.$transaction(async (tx) => {
        // Record Run
        await tx.researchRun.create({
          data: {
            researchId,
            status: 'COMPLETED',
            provider: selectedProviderName,
            model: selectedModelName,
            prompt: userPrompt,
            rawResponse: completion.content,
            promptTokens: completion.usage.promptTokens,
            completionTokens: completion.usage.completionTokens,
            totalTokens: completion.usage.totalTokens,
            latencyMs,
          },
        });

        // Findings
        if (parsedOutput.findings && parsedOutput.findings.length > 0) {
          for (const f of parsedOutput.findings) {
            await tx.researchFinding.create({
              data: {
                researchId,
                category: f.category || 'MARKET_DEMAND',
                title: f.title || 'Market Finding',
                description: f.description || '',
                evidenceType: this.mapEvidenceType(f.evidenceType),
                confidenceLevel: this.mapConfidenceLevel(f.confidenceLevel),
                evidenceDetails: f.evidenceDetails,
                risks: f.risks,
                recommendations: f.recommendations,
              },
            });
          }
        }

        // Sources
        if (parsedOutput.sources && parsedOutput.sources.length > 0) {
          for (const s of parsedOutput.sources) {
            await tx.researchSource.create({
              data: {
                researchId,
                title: s.title || 'Research Source',
                url: s.url,
                sourceType: this.mapSourceType(s.sourceType),
                publicationDate: s.publicationDate,
                snippet: s.snippet,
                isVerified: s.isVerified ?? false,
              },
            });
          }
        }

        // Opportunities
        if (parsedOutput.opportunities && parsedOutput.opportunities.length > 0) {
          for (const opp of parsedOutput.opportunities) {
            await tx.marketOpportunity.create({
              data: {
                workspaceId,
                researchId,
                title: opp.title,
                description: opp.description,
                customerProblem: opp.customerProblem,
                marketDemandEvidence: opp.marketDemandEvidence,
                competitionAnalysis: opp.competitionAnalysis,
                differentiation: opp.differentiation,
                businessFeasibility: opp.businessFeasibility,
                potentialBusinessModel: opp.potentialBusinessModel,
                assumptions: opp.assumptions || [],
                risks: opp.risks || [],
                confidenceLevel: this.mapConfidenceLevel(opp.confidenceLevel),
                suggestedExperiment: opp.suggestedExperiment,
                evidenceType: this.mapEvidenceType(opp.evidenceType),
                status: 'DISCOVERED',
              },
            });
          }
        }

        // Competitors
        if (parsedOutput.competitors && parsedOutput.competitors.length > 0) {
          for (const c of parsedOutput.competitors) {
            await tx.competitor.create({
              data: {
                workspaceId,
                researchId,
                name: c.name,
                website: c.website,
                industry: c.industry || project.industry,
                description: c.description,
                productsServices: c.productsServices,
                positioning: c.positioning,
                pricingObservations: c.pricingObservations,
                contentObservations: c.contentObservations,
                strengths: c.strengths || [],
                weaknesses: c.weaknesses || [],
                differentiationOpportunities: c.differentiationOpportunities,
                evidenceType: this.mapEvidenceType(c.evidenceType),
                isVerified: c.isVerified ?? false,
              },
            });
          }
        }

        // Audience Profiles
        if (parsedOutput.audienceProfiles && parsedOutput.audienceProfiles.length > 0) {
          for (const aud of parsedOutput.audienceProfiles) {
            await tx.audienceProfile.create({
              data: {
                workspaceId,
                researchId,
                segmentName: aud.segmentName,
                isAiGenerated: aud.isAiGenerated ?? true,
                idealCustomerProfile: aud.idealCustomerProfile,
                demographics: aud.demographics,
                painPoints: aud.painPoints || [],
                needs: aud.needs || [],
                buyingMotivations: aud.buyingMotivations || [],
                objections: aud.objections || [],
                customerJourney: aud.customerJourney,
              },
            });
          }
        }

        // AEO Research Questions
        if (parsedOutput.aeoQuestions && parsedOutput.aeoQuestions.length > 0) {
          for (const q of parsedOutput.aeoQuestions) {
            const question = await tx.aEOResearchQuestion.create({
              data: {
                workspaceId,
                researchId,
                topic: q.topic || project.topic,
                queryQuestion: q.queryQuestion,
                targetIndustry: q.targetIndustry || project.industry,
                expectedPersona: q.expectedPersona || project.targetAudience,
              },
            });

            await tx.aEOResearchResult.create({
              data: {
                questionId: question.id,
                provider: selectedProviderName,
                model: selectedModelName,
                brandMentioned: q.brandMentioned ?? false,
                brandRank: q.brandRank,
                brandSentiment: q.brandSentiment || 'NEUTRAL',
                competitorsMentioned: q.competitorsMentioned || [],
                citations: q.citations || [],
                rawAnswerExcerpt: q.rawAnswerExcerpt,
                isActualMeasurement: q.isActualMeasurement ?? false,
              },
            });
          }
        }

        // Update Project
        await tx.researchProject.update({
          where: { id: researchId },
          data: {
            status: 'COMPLETED',
            executiveSummary: parsedOutput.executiveSummary || `Executive research summary for ${project.topic}`,
            methodology: parsedOutput.methodology || 'Multi-model generative research synthesis with bounded workspace context',
            confidenceScore: parsedOutput.confidenceScore ?? 0.85,
            tokensUsed: completion.usage.totalTokens,
            completedAt: new Date(),
          },
        });
      }, {
        maxWait: 15000,
        timeout: 30000,
      });

      // 9. Record token usage
      await this.usageService.recordUsage({
        workspaceId,
        userId,
        provider: selectedProviderName,
        model: selectedModelName,
        requestId: `discover_research_${researchId}`,
        promptTokens: completion.usage.promptTokens,
        completionTokens: completion.usage.completionTokens,
        status: 'SUCCESS',
      });

      this.logger.log(`Discover Research project ${researchId} completed successfully in ${latencyMs}ms`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Discover Research project ${researchId} failed: ${errorMsg}`, err instanceof Error ? err.stack : undefined);

      try {
        const exists = await this.prisma.researchProject.findUnique({
          where: { id: researchId },
          select: { id: true, status: true },
        });

        if (exists && exists.status !== 'CANCELLED') {
          await this.prisma.researchRun.create({
            data: {
              researchId,
              status: 'FAILED',
              provider: selectedProviderName,
              model: selectedModelName,
              error: errorMsg,
              latencyMs: Date.now() - startTime,
            },
          });

          await this.prisma.researchProject.update({
            where: { id: researchId },
            data: {
              status: 'FAILED',
            },
          });
        }
      } catch (logErr) {
        this.logger.warn(`Failed to record research failure trace for ${researchId}: ${logErr}`);
      }

      throw err;
    }
  }

  private safeParseOutput(content: string, fallbackTopic: string): RawResearchOutput {
    try {
      // Clean possible Markdown fence wrapping
      let clean = content.trim();
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(clean);
    } catch (e) {
      this.logger.warn(`Failed to parse AI output as JSON: ${e instanceof Error ? e.message : String(e)}. Using structured fallback.`);
      return {
        executiveSummary: `AI research synthesis completed for ${fallbackTopic}. Note: Raw model response was formatted as text and extracted into safe structure.`,
        methodology: 'Heuristic text extraction with multi-signal fallback.',
        confidenceScore: 0.70,
        findings: [
          {
            category: 'MARKET_DEMAND',
            title: `Market Opportunity Analysis for ${fallbackTopic}`,
            description: content.slice(0, 500),
            evidenceType: 'AI_ANALYSIS',
            confidenceLevel: 'MEDIUM',
            evidenceDetails: 'Extracted from generated response.',
          },
        ],
        opportunities: [],
        competitors: [],
        audienceProfiles: [],
        sources: [
          {
            title: 'AEO Nexus Intelligence Engine',
            sourceType: 'OFFLINE_KNOWLEDGE',
            snippet: 'Synthesized via local fallback parser.',
            isVerified: false,
          },
        ],
        aeoQuestions: [],
      };
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

  private mapConfidenceLevel(val?: string): ConfidenceLevel {
    switch (val?.toUpperCase()) {
      case 'HIGH':
        return ConfidenceLevel.HIGH;
      case 'LOW':
        return ConfidenceLevel.LOW;
      case 'SPECULATIVE':
        return ConfidenceLevel.SPECULATIVE;
      case 'MEDIUM':
      default:
        return ConfidenceLevel.MEDIUM;
    }
  }

  private mapSourceType(val?: string): SourceType {
    switch (val?.toUpperCase()) {
      case 'WEB_SEARCH':
        return SourceType.WEB_SEARCH;
      case 'INDUSTRY_REPORT':
        return SourceType.INDUSTRY_REPORT;
      case 'USER_DOCUMENT':
        return SourceType.USER_DOCUMENT;
      case 'OFFLINE_KNOWLEDGE':
        return SourceType.OFFLINE_KNOWLEDGE;
      case 'KNOWLEDGE_VAULT':
      default:
        return SourceType.KNOWLEDGE_VAULT;
    }
  }
}
