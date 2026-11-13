import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoverQueueService } from './discover-queue.service';
import {
  CreateResearchProjectRequest,
  UpdateResearchProjectRequest,
  CreateCompetitorRequest,
  UpdateCompetitorRequest,
  CreateAudienceProfileRequest,
  UpdateAudienceProfileRequest,
  CreateMarketOpportunityRequest,
  UpdateMarketOpportunityRequest,
  CreateAEOResearchQuestionRequest,
  DiscoverOverviewDto,
  ResearchProjectDto,
  ResearchDetailDto,
  CompetitorDto,
  AudienceProfileDto,
  MarketOpportunityDto,
  ResearchFindingDto,
  AEOResearchQuestionDto,
} from '@aeo-nexus/contracts';
import { EvidenceType, ConfidenceLevel } from '@prisma/client';

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: DiscoverQueueService,
  ) {}

  // 1. Overview
  async getOverview(workspaceId: string): Promise<DiscoverOverviewDto> {
    const [
      totalResearch,
      completedResearch,
      totalOpportunities,
      totalCompetitors,
      totalAudienceProfiles,
      totalAeoQuestions,
      recentResearchRaw,
      recentOpportunitiesRaw,
      recentCompetitorsRaw,
      recentAudienceRaw,
    ] = await Promise.all([
      this.prisma.researchProject.count({ where: { workspaceId } }),
      this.prisma.researchProject.count({ where: { workspaceId, status: 'COMPLETED' } }),
      this.prisma.marketOpportunity.count({ where: { workspaceId } }),
      this.prisma.competitor.count({ where: { workspaceId } }),
      this.prisma.audienceProfile.count({ where: { workspaceId } }),
      this.prisma.aEOResearchQuestion.count({ where: { workspaceId } }),
      this.prisma.researchProject.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: {
            select: {
              findings: true,
              sources: true,
              opportunities: true,
              competitors: true,
            },
          },
        },
      }),
      this.prisma.marketOpportunity.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.competitor.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.audienceProfile.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalResearch,
      completedResearch,
      totalOpportunities,
      totalCompetitors,
      totalAudienceProfiles,
      totalAeoQuestions,
      recentResearch: recentResearchRaw.map((r) => this.mapResearchProject(r)),
      recentOpportunities: recentOpportunitiesRaw.map((o) => this.mapOpportunity(o)),
      recentCompetitors: recentCompetitorsRaw.map((c) => this.mapCompetitor(c)),
      recentAudience: recentAudienceRaw.map((a) => this.mapAudience(a)),
    };
  }

  // 2. Research Projects
  async listResearch(workspaceId: string): Promise<ResearchProjectDto[]> {
    const projects = await this.prisma.researchProject.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            findings: true,
            sources: true,
            opportunities: true,
            competitors: true,
          },
        },
      },
    });

    return projects.map((p) => this.mapResearchProject(p));
  }

  async createResearch(
    workspaceId: string,
    userId: string,
    payload: CreateResearchProjectRequest,
  ): Promise<ResearchDetailDto> {
    const project = await this.prisma.researchProject.create({
      data: {
        workspaceId,
        createdById: userId,
        title: payload.title,
        topic: payload.topic,
        industry: payload.industry,
        targetCountry: payload.targetCountry,
        targetAudience: payload.targetAudience,
        businessDescription: payload.businessDescription,
        objective: payload.objective || 'COMPREHENSIVE',
        status: 'PENDING',
      },
      include: {
        findings: true,
        sources: true,
        opportunities: true,
        competitors: true,
        audienceProfiles: true,
        aeoQuestions: {
          include: { results: true },
        },
        runs: true,
      },
    });

    // Enqueue background research job
    await this.queueService.enqueueResearch({
      researchId: project.id,
      workspaceId,
      userId,
    });

    return this.mapResearchDetail(project);
  }

  async getResearchDetail(workspaceId: string, researchId: string): Promise<ResearchDetailDto> {
    const project = await this.prisma.researchProject.findFirst({
      where: { id: researchId, workspaceId },
      include: {
        findings: { orderBy: { createdAt: 'asc' } },
        sources: { orderBy: { createdAt: 'asc' } },
        opportunities: { orderBy: { createdAt: 'asc' } },
        competitors: { orderBy: { createdAt: 'asc' } },
        audienceProfiles: { orderBy: { createdAt: 'asc' } },
        aeoQuestions: {
          include: { results: true },
          orderBy: { createdAt: 'asc' },
        },
        runs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!project) {
      throw new NotFoundException(`Research project ${researchId} not found in workspace`);
    }

    return this.mapResearchDetail(project);
  }

  async cancelResearch(workspaceId: string, researchId: string): Promise<{ success: boolean; status: string }> {
    const project = await this.prisma.researchProject.findFirst({
      where: { id: researchId, workspaceId },
    });

    if (!project) {
      throw new NotFoundException(`Research project ${researchId} not found`);
    }

    if (project.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel an already completed research project');
    }

    await this.prisma.researchProject.update({
      where: { id: researchId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, status: 'CANCELLED' };
  }

  async rerunResearch(workspaceId: string, userId: string, researchId: string): Promise<ResearchDetailDto> {
    const project = await this.prisma.researchProject.findFirst({
      where: { id: researchId, workspaceId },
    });

    if (!project) {
      throw new NotFoundException(`Research project ${researchId} not found`);
    }

    // Reset status to PENDING
    await this.prisma.researchProject.update({
      where: { id: researchId },
      data: { status: 'PENDING', completedAt: null },
    });

    // Re-enqueue job
    await this.queueService.enqueueResearch({
      researchId,
      workspaceId,
      userId,
    });

    return this.getResearchDetail(workspaceId, researchId);
  }

  async deleteResearch(workspaceId: string, researchId: string): Promise<{ success: boolean }> {
    const project = await this.prisma.researchProject.findFirst({
      where: { id: researchId, workspaceId },
    });

    if (!project) {
      throw new NotFoundException(`Research project ${researchId} not found`);
    }

    await this.prisma.researchProject.delete({
      where: { id: researchId },
    });

    return { success: true };
  }

  // 3. Market Opportunities
  async listOpportunities(workspaceId: string, researchId?: string): Promise<MarketOpportunityDto[]> {
    const opportunities = await this.prisma.marketOpportunity.findMany({
      where: {
        workspaceId,
        ...(researchId ? { researchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return opportunities.map((o) => this.mapOpportunity(o));
  }

  async createOpportunity(workspaceId: string, payload: CreateMarketOpportunityRequest): Promise<MarketOpportunityDto> {
    const created = await this.prisma.marketOpportunity.create({
      data: {
        workspaceId,
        researchId: payload.researchId,
        title: payload.title,
        description: payload.description,
        customerProblem: payload.customerProblem,
        marketDemandEvidence: payload.marketDemandEvidence,
        competitionAnalysis: payload.competitionAnalysis,
        differentiation: payload.differentiation,
        businessFeasibility: payload.businessFeasibility,
        potentialBusinessModel: payload.potentialBusinessModel,
        assumptions: payload.assumptions || [],
        risks: payload.risks || [],
        confidenceLevel: (payload.confidenceLevel as ConfidenceLevel) || 'MEDIUM',
        suggestedExperiment: payload.suggestedExperiment,
        evidenceType: (payload.evidenceType as EvidenceType) || 'AI_ANALYSIS',
        status: payload.status || 'DISCOVERED',
      },
    });

    return this.mapOpportunity(created);
  }

  async updateOpportunity(
    workspaceId: string,
    opportunityId: string,
    payload: UpdateMarketOpportunityRequest,
  ): Promise<MarketOpportunityDto> {
    const existing = await this.prisma.marketOpportunity.findFirst({
      where: { id: opportunityId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found in workspace`);
    }

    const updated = await this.prisma.marketOpportunity.update({
      where: { id: opportunityId },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.description ? { description: payload.description } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.confidenceLevel ? { confidenceLevel: payload.confidenceLevel as ConfidenceLevel } : {}),
        ...(payload.suggestedExperiment ? { suggestedExperiment: payload.suggestedExperiment } : {}),
      },
    });

    return this.mapOpportunity(updated);
  }

  async deleteOpportunity(workspaceId: string, opportunityId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.marketOpportunity.findFirst({
      where: { id: opportunityId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Opportunity ${opportunityId} not found in workspace`);
    }

    await this.prisma.marketOpportunity.delete({
      where: { id: opportunityId },
    });

    return { success: true };
  }

  // 4. Competitors
  async listCompetitors(workspaceId: string, researchId?: string): Promise<CompetitorDto[]> {
    const competitors = await this.prisma.competitor.findMany({
      where: {
        workspaceId,
        ...(researchId ? { researchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return competitors.map((c) => this.mapCompetitor(c));
  }

  async createCompetitor(workspaceId: string, payload: CreateCompetitorRequest): Promise<CompetitorDto> {
    const created = await this.prisma.competitor.create({
      data: {
        workspaceId,
        researchId: payload.researchId,
        name: payload.name,
        website: payload.website,
        industry: payload.industry,
        description: payload.description,
        productsServices: payload.productsServices,
        positioning: payload.positioning,
        pricingObservations: payload.pricingObservations,
        contentObservations: payload.contentObservations,
        strengths: payload.strengths || [],
        weaknesses: payload.weaknesses || [],
        differentiationOpportunities: payload.differentiationOpportunities,
        evidenceType: (payload.evidenceType as EvidenceType) || 'USER_INPUT',
        isVerified: payload.isVerified ?? false,
      },
    });

    return this.mapCompetitor(created);
  }

  async updateCompetitor(
    workspaceId: string,
    competitorId: string,
    payload: UpdateCompetitorRequest,
  ): Promise<CompetitorDto> {
    const existing = await this.prisma.competitor.findFirst({
      where: { id: competitorId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Competitor ${competitorId} not found in workspace`);
    }

    const updated = await this.prisma.competitor.update({
      where: { id: competitorId },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.website !== undefined ? { website: payload.website } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.positioning !== undefined ? { positioning: payload.positioning } : {}),
        ...(payload.strengths ? { strengths: payload.strengths } : {}),
        ...(payload.weaknesses ? { weaknesses: payload.weaknesses } : {}),
        ...(payload.isVerified !== undefined ? { isVerified: payload.isVerified } : {}),
      },
    });

    return this.mapCompetitor(updated);
  }

  async deleteCompetitor(workspaceId: string, competitorId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.competitor.findFirst({
      where: { id: competitorId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Competitor ${competitorId} not found in workspace`);
    }

    await this.prisma.competitor.delete({
      where: { id: competitorId },
    });

    return { success: true };
  }

  // 5. Audience Profiles
  async listAudienceProfiles(workspaceId: string, researchId?: string): Promise<AudienceProfileDto[]> {
    const profiles = await this.prisma.audienceProfile.findMany({
      where: {
        workspaceId,
        ...(researchId ? { researchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.map((p) => this.mapAudience(p));
  }

  async createAudienceProfile(workspaceId: string, payload: CreateAudienceProfileRequest): Promise<AudienceProfileDto> {
    const created = await this.prisma.audienceProfile.create({
      data: {
        workspaceId,
        researchId: payload.researchId,
        segmentName: payload.segmentName,
        isAiGenerated: payload.isAiGenerated ?? false,
        idealCustomerProfile: payload.idealCustomerProfile,
        demographics: payload.demographics,
        painPoints: payload.painPoints || [],
        needs: payload.needs || [],
        buyingMotivations: payload.buyingMotivations || [],
        objections: payload.objections || [],
        customerJourney: payload.customerJourney,
      },
    });

    return this.mapAudience(created);
  }

  async updateAudienceProfile(
    workspaceId: string,
    profileId: string,
    payload: UpdateAudienceProfileRequest,
  ): Promise<AudienceProfileDto> {
    const existing = await this.prisma.audienceProfile.findFirst({
      where: { id: profileId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Audience profile ${profileId} not found in workspace`);
    }

    const updated = await this.prisma.audienceProfile.update({
      where: { id: profileId },
      data: {
        ...(payload.segmentName ? { segmentName: payload.segmentName } : {}),
        ...(payload.idealCustomerProfile !== undefined ? { idealCustomerProfile: payload.idealCustomerProfile } : {}),
        ...(payload.painPoints ? { painPoints: payload.painPoints } : {}),
        ...(payload.needs ? { needs: payload.needs } : {}),
        ...(payload.buyingMotivations ? { buyingMotivations: payload.buyingMotivations } : {}),
        ...(payload.objections ? { objections: payload.objections } : {}),
      },
    });

    return this.mapAudience(updated);
  }

  async deleteAudienceProfile(workspaceId: string, profileId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.audienceProfile.findFirst({
      where: { id: profileId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Audience profile ${profileId} not found in workspace`);
    }

    await this.prisma.audienceProfile.delete({
      where: { id: profileId },
    });

    return { success: true };
  }

  // 6. Market Trends
  async listMarketTrends(workspaceId: string): Promise<ResearchFindingDto[]> {
    const findings = await this.prisma.researchFinding.findMany({
      where: {
        research: { workspaceId },
        category: { in: ['TREND', 'MARKET_DEMAND', 'THREAT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return findings.map((f) => ({
      id: f.id,
      researchId: f.researchId,
      category: f.category,
      title: f.title,
      description: f.description,
      evidenceType: f.evidenceType,
      confidenceLevel: f.confidenceLevel,
      evidenceDetails: f.evidenceDetails,
      risks: f.risks,
      recommendations: f.recommendations,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
  }

  // 7. AEO Research
  async listAEOResearch(workspaceId: string): Promise<AEOResearchQuestionDto[]> {
    const questions = await this.prisma.aEOResearchQuestion.findMany({
      where: { workspaceId },
      include: {
        results: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return questions.map((q) => ({
      id: q.id,
      workspaceId: q.workspaceId,
      researchId: q.researchId,
      topic: q.topic,
      queryQuestion: q.queryQuestion,
      targetIndustry: q.targetIndustry,
      expectedPersona: q.expectedPersona,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      results: q.results.map((r) => ({
        id: r.id,
        questionId: r.questionId,
        provider: r.provider,
        model: r.model,
        brandMentioned: r.brandMentioned,
        brandRank: r.brandRank,
        brandSentiment: r.brandSentiment,
        competitorsMentioned: r.competitorsMentioned,
        citations: r.citations as any,
        rawAnswerExcerpt: r.rawAnswerExcerpt,
        isActualMeasurement: r.isActualMeasurement,
        researchTimestamp: r.researchTimestamp.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    }));
  }

  async createAEOResearchQuestion(
    workspaceId: string,
    payload: CreateAEOResearchQuestionRequest,
  ): Promise<AEOResearchQuestionDto> {
    const question = await this.prisma.aEOResearchQuestion.create({
      data: {
        workspaceId,
        researchId: payload.researchId,
        topic: payload.topic,
        queryQuestion: payload.queryQuestion,
        targetIndustry: payload.targetIndustry,
        expectedPersona: payload.expectedPersona,
      },
      include: {
        results: true,
      },
    });

    return {
      id: question.id,
      workspaceId: question.workspaceId,
      researchId: question.researchId,
      topic: question.topic,
      queryQuestion: question.queryQuestion,
      targetIndustry: question.targetIndustry,
      expectedPersona: question.expectedPersona,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
      results: [],
    };
  }

  // 8. Reports
  async listReports(workspaceId: string): Promise<ResearchProjectDto[]> {
    const reports = await this.prisma.researchProject.findMany({
      where: { workspaceId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: {
        _count: {
          select: {
            findings: true,
            sources: true,
            opportunities: true,
            competitors: true,
          },
        },
      },
    });

    return reports.map((r) => this.mapResearchProject(r));
  }

  // Helper Mappers
  private mapResearchProject(r: any): ResearchProjectDto {
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      createdById: r.createdById,
      title: r.title,
      topic: r.topic,
      industry: r.industry,
      targetCountry: r.targetCountry,
      targetAudience: r.targetAudience,
      businessDescription: r.businessDescription,
      objective: r.objective,
      status: r.status,
      executiveSummary: r.executiveSummary,
      methodology: r.methodology,
      confidenceScore: r.confidenceScore,
      tokensUsed: r.tokensUsed,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      findingsCount: r._count?.findings ?? 0,
      sourcesCount: r._count?.sources ?? 0,
      opportunitiesCount: r._count?.opportunities ?? 0,
      competitorsCount: r._count?.competitors ?? 0,
    };
  }

  private mapResearchDetail(p: any): ResearchDetailDto {
    const base = this.mapResearchProject(p);
    return {
      ...base,
      findings: (p.findings || []).map((f: any) => ({
        id: f.id,
        researchId: f.researchId,
        category: f.category,
        title: f.title,
        description: f.description,
        evidenceType: f.evidenceType,
        confidenceLevel: f.confidenceLevel,
        evidenceDetails: f.evidenceDetails,
        risks: f.risks,
        recommendations: f.recommendations,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      sources: (p.sources || []).map((s: any) => ({
        id: s.id,
        researchId: s.researchId,
        title: s.title,
        url: s.url,
        sourceType: s.sourceType,
        publicationDate: s.publicationDate,
        accessTimestamp: s.accessTimestamp.toISOString(),
        snippet: s.snippet,
        isVerified: s.isVerified,
        createdAt: s.createdAt.toISOString(),
      })),
      opportunities: (p.opportunities || []).map((o: any) => this.mapOpportunity(o)),
      competitors: (p.competitors || []).map((c: any) => this.mapCompetitor(c)),
      audienceProfiles: (p.audienceProfiles || []).map((a: any) => this.mapAudience(a)),
      aeoQuestions: (p.aeoQuestions || []).map((q: any) => ({
        id: q.id,
        workspaceId: q.workspaceId,
        researchId: q.researchId,
        topic: q.topic,
        queryQuestion: q.queryQuestion,
        targetIndustry: q.targetIndustry,
        expectedPersona: q.expectedPersona,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        results: (q.results || []).map((r: any) => ({
          id: r.id,
          questionId: r.questionId,
          provider: r.provider,
          model: r.model,
          brandMentioned: r.brandMentioned,
          brandRank: r.brandRank,
          brandSentiment: r.brandSentiment,
          competitorsMentioned: r.competitorsMentioned,
          citations: r.citations,
          rawAnswerExcerpt: r.rawAnswerExcerpt,
          isActualMeasurement: r.isActualMeasurement,
          researchTimestamp: r.researchTimestamp.toISOString(),
          createdAt: r.createdAt.toISOString(),
        })),
      })),
      runs: (p.runs || []).map((rn: any) => ({
        id: rn.id,
        researchId: rn.researchId,
        status: rn.status,
        provider: rn.provider,
        model: rn.model,
        prompt: rn.prompt,
        rawResponse: rn.rawResponse,
        error: rn.error,
        promptTokens: rn.promptTokens,
        completionTokens: rn.completionTokens,
        totalTokens: rn.totalTokens,
        latencyMs: rn.latencyMs,
        createdAt: rn.createdAt.toISOString(),
        updatedAt: rn.updatedAt.toISOString(),
      })),
    };
  }

  private mapOpportunity(o: any): MarketOpportunityDto {
    return {
      id: o.id,
      workspaceId: o.workspaceId,
      researchId: o.researchId,
      title: o.title,
      description: o.description,
      customerProblem: o.customerProblem,
      marketDemandEvidence: o.marketDemandEvidence,
      competitionAnalysis: o.competitionAnalysis,
      differentiation: o.differentiation,
      businessFeasibility: o.businessFeasibility,
      potentialBusinessModel: o.potentialBusinessModel,
      assumptions: o.assumptions || [],
      risks: o.risks || [],
      confidenceLevel: o.confidenceLevel,
      suggestedExperiment: o.suggestedExperiment,
      evidenceType: o.evidenceType,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    };
  }

  private mapCompetitor(c: any): CompetitorDto {
    return {
      id: c.id,
      workspaceId: c.workspaceId,
      researchId: c.researchId,
      name: c.name,
      website: c.website,
      industry: c.industry,
      description: c.description,
      productsServices: c.productsServices,
      positioning: c.positioning,
      pricingObservations: c.pricingObservations,
      contentObservations: c.contentObservations,
      strengths: c.strengths || [],
      weaknesses: c.weaknesses || [],
      differentiationOpportunities: c.differentiationOpportunities,
      evidenceType: c.evidenceType,
      isVerified: c.isVerified,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private mapAudience(a: any): AudienceProfileDto {
    return {
      id: a.id,
      workspaceId: a.workspaceId,
      researchId: a.researchId,
      segmentName: a.segmentName,
      isAiGenerated: a.isAiGenerated,
      idealCustomerProfile: a.idealCustomerProfile,
      demographics: a.demographics,
      painPoints: a.painPoints || [],
      needs: a.needs || [],
      buyingMotivations: a.buyingMotivations || [],
      objections: a.objections || [],
      customerJourney: a.customerJourney,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}

