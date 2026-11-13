import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanQueueService } from './plan-queue.service';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateStrategicPlanRequest,
  GenerateStrategicPlanRequest,
  UpdateStrategicPlanRequest,
  CreateBusinessGoalRequest,
  UpdateBusinessGoalRequest,
  RecordGoalProgressRequest,
  CreateStrategicInitiativeRequest,
  UpdateStrategicInitiativeRequest,
  ConvertInitiativeToProjectRequest,
  CreateInitiativeDependencyRequest,
  CreateStrategicRoadmapRequest,
  UpdateStrategicRoadmapRequest,
  CreateRoadmapPhaseRequest,
  CreateRoadmapMilestoneRequest,
  UpdateRoadmapMilestoneRequest,
  CreateStrategyReviewRequest,
  PlanningOverviewDto,
  StrategicPlanDto,
  StrategicPlanDetailDto,
  BusinessGoalDto,
  StrategicInitiativeDto,
  StrategicRoadmapDto,
  RoadmapMilestoneDto,
  StrategyReviewDto,
  PlanningRecommendationDto,
} from '@aeo-nexus/contracts';
import {
  PlanStatus,
  GoalStatus,
  GoalCategory,
  GoalPriority,
  InitiativePriority,
  InitiativeStatus,
  EvidenceType,
  ReviewPeriod,
  ReviewStatus,
} from '@prisma/client';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: PlanQueueService,
    private readonly projectsService: ProjectsService,
  ) {}

  // ===========================================================================
  // 1. Dashboard Overview Aggregation
  // ===========================================================================

  async getOverview(workspaceId: string): Promise<PlanningOverviewDto> {
    const now = new Date();

    const [
      totalPlans,
      activePlans,
      totalGoals,
      achievedGoals,
      totalInitiatives,
      highPriorityInitiatives,
      activePlansListRaw,
      goalsRaw,
      initiativesRaw,
      milestonesRaw,
      recommendationsRaw,
      recentReviewsRaw,
    ] = await Promise.all([
      this.prisma.strategicPlan.count({ where: { workspaceId } }),
      this.prisma.strategicPlan.count({
        where: { workspaceId, status: { in: ['ACTIVE', 'APPROVED', 'READY_FOR_REVIEW'] } },
      }),
      this.prisma.businessGoal.count({ where: { workspaceId } }),
      this.prisma.businessGoal.count({ where: { workspaceId, status: 'ACHIEVED' } }),
      this.prisma.strategicInitiative.count({ where: { workspaceId } }),
      this.prisma.strategicInitiative.count({
        where: { workspaceId, priority: { in: ['HIGH', 'CRITICAL'] } },
      }),
      this.prisma.strategicPlan.findMany({
        where: { workspaceId, status: { not: 'ARCHIVED' } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          _count: {
            select: {
              goals: true,
              initiatives: true,
              roadmaps: true,
            },
          },
        },
      }),
      this.prisma.businessGoal.findMany({
        where: { workspaceId },
        orderBy: { targetDate: 'asc' },
        take: 6,
        include: {
          progressRecords: {
            orderBy: { recordedAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.strategicInitiative.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          outgoingDependencies: {
            include: {
              dependsOn: {
                select: { id: true, name: true, status: true, priority: true },
              },
            },
          },
        },
      }),
      this.prisma.roadmapMilestone.findMany({
        where: { workspaceId },
        orderBy: { targetDate: 'asc' },
      }),
      this.prisma.planningRecommendation.findMany({
        where: { workspaceId, isActioned: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.strategyReview.findMany({
        where: { workspaceId },
        orderBy: { reviewDate: 'desc' },
        take: 5,
      }),
    ]);

    const upcomingMilestones: RoadmapMilestoneDto[] = [];
    const overdueMilestones: RoadmapMilestoneDto[] = [];

    for (const m of milestonesRaw) {
      const isOverdue = m.status !== 'COMPLETED' && m.targetDate < now;
      const dto: RoadmapMilestoneDto = {
        id: m.id,
        workspaceId: m.workspaceId,
        roadmapId: m.roadmapId,
        phaseId: m.phaseId,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate.toISOString(),
        status: m.status,
        successCriteria: m.successCriteria,
        isOverdue,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };

      if (isOverdue) {
        overdueMilestones.push(dto);
      } else {
        upcomingMilestones.push(dto);
      }
    }

    return {
      totalPlans,
      activePlans,
      totalGoals,
      achievedGoals,
      totalInitiatives,
      highPriorityInitiatives,
      upcomingMilestonesCount: upcomingMilestones.length,
      overdueMilestonesCount: overdueMilestones.length,
      activePlansList: activePlansListRaw.map((p) => this.mapPlanDto(p)),
      goals: goalsRaw.map((g) => this.mapGoalDto(g)),
      initiatives: initiativesRaw.map((i) => this.mapInitiativeDto(i)),
      upcomingMilestones: upcomingMilestones.slice(0, 5),
      overdueMilestones: overdueMilestones.slice(0, 5),
      recommendations: recommendationsRaw.map((r) => this.mapRecommendationDto(r)),
      recentReviews: recentReviewsRaw.map((rv) => this.mapReviewDto(rv)),
    };
  }

  // ===========================================================================
  // 2. Strategic Plans CRUD
  // ===========================================================================

  async createPlan(
    workspaceId: string,
    userId: string,
    dto: CreateStrategicPlanRequest,
  ): Promise<StrategicPlanDto> {
    const plan = await this.prisma.strategicPlan.create({
      data: {
        workspaceId,
        createdById: userId,
        title: dto.title.trim(),
        planType: dto.planType || 'BUSINESS_LAUNCH',
        businessStage: dto.businessStage || null,
        targetMarket: dto.targetMarket || null,
        targetAudience: dto.targetAudience || null,
        horizonMonths: dto.horizonMonths || 12,
        budgetRange: dto.budgetRange || null,
        teamSize: dto.teamSize || null,
        status: 'DRAFT',
        executiveSummary: dto.executiveSummary || null,
        currentSituation: dto.currentSituation || null,
        marketPositioning: dto.marketPositioning || null,
        strategicObjectives: dto.strategicObjectives || [],
        requiredResources: dto.requiredResources || [],
        budgetAssumptions: dto.budgetAssumptions || [],
        risksAndMitigations: dto.risksAndMitigations || [],
        dependencies: dto.dependencies || [],
        timelineAssumptions: dto.timelineAssumptions || [],
        successMetrics: dto.successMetrics || [],
        validationRequirements: dto.validationRequirements || [],
        nextRecommendedActions: dto.nextRecommendedActions || [],
        confidenceScore: dto.confidenceScore || 0.85,
        researchId: dto.researchId || null,
        opportunityId: dto.opportunityId || null,
        currentVersionNumber: 1,
      },
    });

    // Create v1 initial version record
    await this.prisma.strategicPlanVersion.create({
      data: {
        planId: plan.id,
        versionNumber: 1,
        title: `${plan.title} (Draft v1)`,
        content: plan,
        changeSummary: 'Initial plan draft created.',
        createdById: userId,
      },
    });

    return this.mapPlanDto(plan);
  }

  async generatePlan(
    workspaceId: string,
    userId: string,
    dto: GenerateStrategicPlanRequest,
  ): Promise<StrategicPlanDto> {
    const plan = await this.prisma.strategicPlan.create({
      data: {
        workspaceId,
        createdById: userId,
        title: dto.title.trim(),
        planType: dto.planType || 'BUSINESS_LAUNCH',
        businessStage: dto.businessStage || null,
        targetMarket: dto.targetMarket || null,
        targetAudience: dto.targetAudience || null,
        budgetRange: dto.budgetRange || null,
        teamSize: dto.teamSize || null,
        status: 'GENERATING',
        researchId: dto.researchId || null,
        opportunityId: dto.opportunityId || null,
        currentVersionNumber: 1,
      },
    });

    // Enqueue generation job to BullMQ queue / background
    await this.queueService.enqueuePlanGeneration({
      planId: plan.id,
      workspaceId,
      userId,
    });

    return this.mapPlanDto(plan);
  }

  async listPlans(
    workspaceId: string,
    params?: { status?: string; search?: string },
  ): Promise<StrategicPlanDto[]> {
    const where: any = { workspaceId };
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { targetMarket: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const plans = await this.prisma.strategicPlan.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            goals: true,
            initiatives: true,
            roadmaps: true,
          },
        },
      },
    });

    return plans.map((p) => this.mapPlanDto(p));
  }

  async getPlan(workspaceId: string, planId: string): Promise<StrategicPlanDetailDto> {
    const plan = await this.prisma.strategicPlan.findUnique({
      where: { id: planId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        goals: {
          include: {
            progressRecords: { orderBy: { recordedAt: 'desc' } },
          },
          orderBy: { targetDate: 'asc' },
        },
        initiatives: {
          include: {
            outgoingDependencies: {
              include: {
                dependsOn: {
                  select: { id: true, name: true, status: true, priority: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        roadmaps: {
          include: {
            phases: {
              include: {
                milestones: true,
              },
              orderBy: { phaseOrder: 'asc' },
            },
            milestones: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: { orderBy: { reviewDate: 'desc' } },
        recommendations: { orderBy: { createdAt: 'desc' } },
        _count: {
          select: {
            goals: true,
            initiatives: true,
            roadmaps: true,
          },
        },
      },
    });

    if (!plan || plan.workspaceId !== workspaceId) {
      throw new NotFoundException('Strategic Plan not found in this workspace');
    }

    const baseDto = this.mapPlanDto(plan);
    return {
      ...baseDto,
      versions: plan.versions.map((v) => ({
        id: v.id,
        planId: v.planId,
        versionNumber: v.versionNumber,
        title: v.title,
        content: v.content,
        changeSummary: v.changeSummary,
        createdById: v.createdById,
        createdAt: v.createdAt.toISOString(),
      })),
      goals: plan.goals.map((g) => this.mapGoalDto(g)),
      initiatives: plan.initiatives.map((i) => this.mapInitiativeDto(i)),
      roadmaps: plan.roadmaps.map((r) => this.mapRoadmapDto(r)),
      reviews: plan.reviews.map((rv) => this.mapReviewDto(rv)),
      recommendations: plan.recommendations.map((rec) => this.mapRecommendationDto(rec)),
    };
  }

  async updatePlan(
    workspaceId: string,
    planId: string,
    dto: UpdateStrategicPlanRequest,
  ): Promise<StrategicPlanDto> {
    await this.verifyPlanAccess(workspaceId, planId);

    const updated = await this.prisma.strategicPlan.update({
      where: { id: planId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.planType && { planType: dto.planType }),
        ...(dto.businessStage !== undefined && { businessStage: dto.businessStage }),
        ...(dto.targetMarket !== undefined && { targetMarket: dto.targetMarket }),
        ...(dto.targetAudience !== undefined && { targetAudience: dto.targetAudience }),
        ...(dto.horizonMonths !== undefined && { horizonMonths: dto.horizonMonths }),
        ...(dto.budgetRange !== undefined && { budgetRange: dto.budgetRange }),
        ...(dto.teamSize !== undefined && { teamSize: dto.teamSize }),
        ...(dto.status && { status: dto.status as any }),
        ...(dto.executiveSummary !== undefined && { executiveSummary: dto.executiveSummary }),
        ...(dto.currentSituation !== undefined && { currentSituation: dto.currentSituation }),
        ...(dto.marketPositioning !== undefined && { marketPositioning: dto.marketPositioning }),
        ...(dto.strategicObjectives && { strategicObjectives: dto.strategicObjectives }),
        ...(dto.requiredResources && { requiredResources: dto.requiredResources }),
        ...(dto.budgetAssumptions && { budgetAssumptions: dto.budgetAssumptions }),
        ...(dto.risksAndMitigations !== undefined && { risksAndMitigations: dto.risksAndMitigations }),
        ...(dto.dependencies && { dependencies: dto.dependencies }),
        ...(dto.timelineAssumptions && { timelineAssumptions: dto.timelineAssumptions }),
        ...(dto.successMetrics && { successMetrics: dto.successMetrics }),
        ...(dto.validationRequirements && { validationRequirements: dto.validationRequirements }),
        ...(dto.nextRecommendedActions && { nextRecommendedActions: dto.nextRecommendedActions }),
        ...(dto.confidenceScore !== undefined && { confidenceScore: dto.confidenceScore }),
      },
    });

    return this.mapPlanDto(updated);
  }

  async approvePlan(
    workspaceId: string,
    planId: string,
    userId: string,
  ): Promise<StrategicPlanDto> {
    const plan = await this.verifyPlanAccess(workspaceId, planId);

    const newVersionNumber = plan.currentVersionNumber + 1;

    const [updatedPlan] = await this.prisma.$transaction([
      this.prisma.strategicPlan.update({
        where: { id: planId },
        data: {
          status: 'APPROVED',
          currentVersionNumber: newVersionNumber,
        },
      }),
      this.prisma.strategicPlanVersion.create({
        data: {
          planId,
          versionNumber: newVersionNumber,
          title: `${plan.title} (v${newVersionNumber}.0 Approved)`,
          content: plan,
          changeSummary: 'Formal strategic plan approval by workspace owner.',
          createdById: userId,
        },
      }),
    ]);

    return this.mapPlanDto(updatedPlan);
  }

  async deletePlan(workspaceId: string, planId: string): Promise<void> {
    await this.verifyPlanAccess(workspaceId, planId);
    await this.prisma.strategicPlan.delete({
      where: { id: planId },
    });
  }

  // ===========================================================================
  // 3. Business Goals & KPI Progress Tracking
  // ===========================================================================

  async listGoals(
    workspaceId: string,
    params?: { planId?: string; category?: string; status?: string },
  ): Promise<BusinessGoalDto[]> {
    const where: any = { workspaceId };
    if (params?.planId) where.planId = params.planId;
    if (params?.category) where.category = params.category;
    if (params?.status) where.status = params.status;

    const goals = await this.prisma.businessGoal.findMany({
      where,
      orderBy: { targetDate: 'asc' },
      include: {
        progressRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 5,
        },
      },
    });

    return goals.map((g) => this.mapGoalDto(g));
  }

  async getGoal(workspaceId: string, goalId: string): Promise<BusinessGoalDto> {
    const goal = await this.prisma.businessGoal.findUnique({
      where: { id: goalId },
      include: {
        progressRecords: {
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!goal || goal.workspaceId !== workspaceId) {
      throw new NotFoundException('Business Goal not found in this workspace');
    }

    return this.mapGoalDto(goal);
  }

  async createGoal(
    workspaceId: string,
    userId: string,
    dto: CreateBusinessGoalRequest,
  ): Promise<BusinessGoalDto> {
    const targetVal = Number(dto.targetValue) || 100;
    const currentVal = Number(dto.currentValue) || 0;

    const goal = await this.prisma.businessGoal.create({
      data: {
        workspaceId,
        planId: dto.planId || null,
        title: dto.title.trim(),
        description: dto.description || null,
        category: (dto.category as GoalCategory) || GoalCategory.REVENUE,
        targetValue: targetVal,
        currentValue: currentVal,
        unit: dto.unit || 'USD',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        targetDate: dto.targetDate
          ? new Date(dto.targetDate)
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: (dto.status as GoalStatus) || GoalStatus.NOT_STARTED,
        priority: (dto.priority as GoalPriority) || GoalPriority.MEDIUM,
        measurementFrequency: dto.measurementFrequency || 'MONTHLY',
        isQualitative: Boolean(dto.isQualitative),
        assignedOwnerId: dto.assignedOwnerId || null,
      },
    });

    return this.mapGoalDto(goal);
  }

  async updateGoal(
    workspaceId: string,
    goalId: string,
    dto: UpdateBusinessGoalRequest,
  ): Promise<BusinessGoalDto> {
    const existing = await this.verifyGoalAccess(workspaceId, goalId);

    const targetVal = dto.targetValue !== undefined ? Number(dto.targetValue) : existing.targetValue;
    const currentVal = dto.currentValue !== undefined ? Number(dto.currentValue) : existing.currentValue;

    const updated = await this.prisma.businessGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category as GoalCategory }),
        targetValue: targetVal,
        currentValue: currentVal,
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
        ...(dto.status && { status: dto.status as GoalStatus }),
        ...(dto.priority && { priority: dto.priority as GoalPriority }),
        ...(dto.measurementFrequency && { measurementFrequency: dto.measurementFrequency }),
        ...(dto.isQualitative !== undefined && { isQualitative: dto.isQualitative }),
        ...(dto.assignedOwnerId !== undefined && { assignedOwnerId: dto.assignedOwnerId }),
      },
    });

    return this.mapGoalDto(updated);
  }

  async recordGoalProgress(
    workspaceId: string,
    goalId: string,
    userId: string,
    dto: RecordGoalProgressRequest,
  ): Promise<BusinessGoalDto> {
    const goal = await this.verifyGoalAccess(workspaceId, goalId);

    const prevValue = goal.currentValue;
    const newValue = Number(dto.newValue);
    const targetVal = goal.targetValue;
    const progressPercent =
      targetVal > 0 ? Math.min(100, Math.round((newValue / targetVal) * 100)) : 0;

    let newStatus = goal.status;
    if (progressPercent >= 100) {
      newStatus = GoalStatus.ACHIEVED;
    } else if (progressPercent > 0 && goal.status === GoalStatus.NOT_STARTED) {
      newStatus = GoalStatus.IN_PROGRESS;
    }

    const [updatedGoal] = await this.prisma.$transaction([
      this.prisma.businessGoal.update({
        where: { id: goalId },
        data: {
          currentValue: newValue,
          status: newStatus,
        },
        include: {
          progressRecords: {
            orderBy: { recordedAt: 'desc' },
          },
        },
      }),
      this.prisma.goalProgressRecord.create({
        data: {
          goalId,
          recordedById: userId,
          previousValue: prevValue,
          newValue,
          note: dto.note || null,
          isExternalMeasurement: Boolean(dto.isExternalMeasurement),
        },
      }),
    ]);

    return this.mapGoalDto(updatedGoal);
  }

  async deleteGoal(workspaceId: string, goalId: string): Promise<void> {
    await this.verifyGoalAccess(workspaceId, goalId);
    await this.prisma.businessGoal.delete({ where: { id: goalId } });
  }

  // ===========================================================================
  // 4. Strategic Initiatives, Dependencies & Project Conversion
  // ===========================================================================

  async listInitiatives(
    workspaceId: string,
    params?: { planId?: string; priority?: string; status?: string },
  ): Promise<StrategicInitiativeDto[]> {
    const where: any = { workspaceId };
    if (params?.planId) where.planId = params.planId;
    if (params?.priority) where.priority = params.priority;
    if (params?.status) where.status = params.status;

    const initiatives = await this.prisma.strategicInitiative.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        outgoingDependencies: {
          include: {
            dependsOn: {
              select: { id: true, name: true, status: true, priority: true },
            },
          },
        },
      },
    });

    return initiatives.map((i) => this.mapInitiativeDto(i));
  }

  async getInitiative(workspaceId: string, initiativeId: string): Promise<StrategicInitiativeDto> {
    const initiative = await this.prisma.strategicInitiative.findUnique({
      where: { id: initiativeId },
      include: {
        outgoingDependencies: {
          include: {
            dependsOn: {
              select: { id: true, name: true, status: true, priority: true },
            },
          },
        },
      },
    });

    if (!initiative || initiative.workspaceId !== workspaceId) {
      throw new NotFoundException('Strategic Initiative not found in this workspace');
    }

    return this.mapInitiativeDto(initiative);
  }

  async createInitiative(
    workspaceId: string,
    userId: string,
    dto: CreateStrategicInitiativeRequest,
  ): Promise<StrategicInitiativeDto> {
    const initiative = await this.prisma.strategicInitiative.create({
      data: {
        workspaceId,
        planId: dto.planId || null,
        goalId: dto.goalId || null,
        opportunityId: dto.opportunityId || null,
        roadmapPhaseId: dto.roadmapPhaseId || null,
        name: dto.name.trim(),
        description: dto.description || null,
        strategicRationale: dto.strategicRationale || null,
        priority: (dto.priority as InitiativePriority) || InitiativePriority.MEDIUM,
        status: (dto.status as InitiativeStatus) || InitiativeStatus.PLANNED,
        expectedImpact: dto.expectedImpact || 'HIGH',
        estimatedEffort: dto.estimatedEffort || 'MEDIUM',
        estimatedCost: dto.estimatedCost || null,
        risks: dto.risks || [],
        recommendedActions: dto.recommendedActions || [],
        evidenceReferences: dto.evidenceReferences || null,
        evidenceType: (dto.evidenceType as EvidenceType) || EvidenceType.AI_ANALYSIS,
        ownerId: dto.ownerId || userId,
      },
    });

    return this.mapInitiativeDto(initiative);
  }

  async updateInitiative(
    workspaceId: string,
    initiativeId: string,
    dto: UpdateStrategicInitiativeRequest,
  ): Promise<StrategicInitiativeDto> {
    await this.verifyInitiativeAccess(workspaceId, initiativeId);

    const updated = await this.prisma.strategicInitiative.update({
      where: { id: initiativeId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.strategicRationale !== undefined && { strategicRationale: dto.strategicRationale }),
        ...(dto.priority && { priority: dto.priority as InitiativePriority }),
        ...(dto.status && { status: dto.status as InitiativeStatus }),
        ...(dto.expectedImpact && { expectedImpact: dto.expectedImpact }),
        ...(dto.estimatedEffort && { estimatedEffort: dto.estimatedEffort }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost }),
        ...(dto.risks && { risks: dto.risks }),
        ...(dto.recommendedActions && { recommendedActions: dto.recommendedActions }),
        ...(dto.evidenceType && { evidenceType: dto.evidenceType as EvidenceType }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      },
      include: {
        outgoingDependencies: {
          include: {
            dependsOn: {
              select: { id: true, name: true, status: true, priority: true },
            },
          },
        },
      },
    });

    return this.mapInitiativeDto(updated);
  }

  async deleteInitiative(workspaceId: string, initiativeId: string): Promise<void> {
    await this.verifyInitiativeAccess(workspaceId, initiativeId);
    await this.prisma.strategicInitiative.delete({ where: { id: initiativeId } });
  }

  // ---------------------------------------------------------------------------
  // Initiative Dependency with Topological DFS Cycle Detection
  // ---------------------------------------------------------------------------

  async addDependency(
    workspaceId: string,
    initiativeId: string,
    dto: CreateInitiativeDependencyRequest,
  ) {
    if (initiativeId === dto.dependsOnId) {
      throw new BadRequestException('An initiative cannot depend on itself');
    }

    const [init, dependsOn] = await Promise.all([
      this.prisma.strategicInitiative.findUnique({ where: { id: initiativeId } }),
      this.prisma.strategicInitiative.findUnique({ where: { id: dto.dependsOnId } }),
    ]);

    if (!init || init.workspaceId !== workspaceId) {
      throw new NotFoundException(`Initiative ${initiativeId} not found in this workspace`);
    }
    if (!dependsOn || dependsOn.workspaceId !== workspaceId) {
      throw new NotFoundException(`Dependency target initiative ${dto.dependsOnId} not found in this workspace`);
    }

    // Topological DFS cycle check
    const hasCycle = await this.detectCycle(initiativeId, dto.dependsOnId, workspaceId);
    if (hasCycle) {
      throw new BadRequestException('Circular dependency detected between strategic initiatives');
    }

    // Idempotent upsert
    const existing = await this.prisma.initiativeDependency.findFirst({
      where: { initiativeId, dependsOnId: dto.dependsOnId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.initiativeDependency.create({
      data: {
        initiativeId,
        dependsOnId: dto.dependsOnId,
        dependencyType: dto.dependencyType || 'BLOCKS',
      },
    });
  }

  private async detectCycle(
    initiativeId: string,
    dependsOnId: string,
    workspaceId: string,
  ): Promise<boolean> {
    if (initiativeId === dependsOnId) return true;

    const allDeps = await this.prisma.initiativeDependency.findMany({
      where: {
        initiative: { workspaceId },
      },
      select: { initiativeId: true, dependsOnId: true },
    });

    const adj = new Map<string, string[]>();
    for (const d of allDeps) {
      if (!adj.has(d.initiativeId)) adj.set(d.initiativeId, []);
      adj.get(d.initiativeId)!.push(d.dependsOnId);
    }

    // Add candidate edge: initiativeId -> dependsOnId
    if (!adj.has(initiativeId)) adj.set(initiativeId, []);
    adj.get(initiativeId)!.push(dependsOnId);

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    return dfs(initiativeId);
  }

  async removeDependency(
    workspaceId: string,
    initiativeId: string,
    dependencyId: string,
  ): Promise<void> {
    await this.verifyInitiativeAccess(workspaceId, initiativeId);
    await this.prisma.initiativeDependency.deleteMany({
      where: { id: dependencyId, initiativeId },
    });
  }

  // ---------------------------------------------------------------------------
  // Initiative to Project Conversion
  // ---------------------------------------------------------------------------

  async convertInitiativeToProject(
    workspaceId: string,
    initiativeId: string,
    userId: string,
    dto: ConvertInitiativeToProjectRequest,
  ): Promise<{
    initiativeId: string;
    projectId: string;
    projectName: string;
    tasksCreated: number;
  }> {
    const initiative = await this.verifyInitiativeAccess(workspaceId, initiativeId);

    if (initiative.projectId) {
      throw new ConflictException('Initiative has already been converted to a project');
    }

    const projectName = (dto.projectName || initiative.name).trim();
    const projectDescription =
      dto.projectDescription ||
      initiative.description ||
      `Strategic Project initiated from Initiative: ${initiative.name}`;

    // Create the Project using ProjectsService
    const project = await this.projectsService.createProject(workspaceId, userId, {
      name: projectName,
      description: projectDescription,
      status: 'PLANNING',
    });

    let tasksCreated = 0;
    if (dto.createInitialTasks !== false) {
      const actions =
        initiative.recommendedActions && initiative.recommendedActions.length > 0
          ? initiative.recommendedActions
          : [`Execute initial deliverables for ${initiative.name}`];

      for (const action of actions) {
        await this.projectsService.createTask(workspaceId, userId, {
          projectId: project.id,
          title: action.slice(0, 150),
          description: `Deliverable generated from Strategic Initiative: ${initiative.name}`,
          status: 'TODO',
          priority: 'MEDIUM',
        });
        tasksCreated++;
      }
    }

    // Link initiative with project
    await this.prisma.strategicInitiative.update({
      where: { id: initiativeId },
      data: {
        projectId: project.id,
        convertedAt: new Date(),
        status: InitiativeStatus.IN_PROGRESS,
      },
    });

    return {
      initiativeId,
      projectId: project.id,
      projectName: project.name,
      tasksCreated,
    };
  }

  // ===========================================================================
  // 5. Strategic Roadmaps, Phases & Milestones
  // ===========================================================================

  async listRoadmaps(workspaceId: string, planId?: string): Promise<StrategicRoadmapDto[]> {
    const where: any = { workspaceId };
    if (planId) where.planId = planId;

    const roadmaps = await this.prisma.strategicRoadmap.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        phases: {
          include: {
            milestones: true,
          },
          orderBy: { phaseOrder: 'asc' },
        },
        milestones: true,
      },
    });

    return roadmaps.map((r) => this.mapRoadmapDto(r));
  }

  async getRoadmap(workspaceId: string, roadmapId: string): Promise<StrategicRoadmapDto> {
    const roadmap = await this.prisma.strategicRoadmap.findUnique({
      where: { id: roadmapId },
      include: {
        phases: {
          include: {
            milestones: true,
          },
          orderBy: { phaseOrder: 'asc' },
        },
        milestones: true,
      },
    });

    if (!roadmap || roadmap.workspaceId !== workspaceId) {
      throw new NotFoundException('Strategic Roadmap not found in this workspace');
    }

    return this.mapRoadmapDto(roadmap);
  }

  async createRoadmap(
    workspaceId: string,
    dto: CreateStrategicRoadmapRequest,
  ): Promise<StrategicRoadmapDto> {
    const roadmap = await this.prisma.strategicRoadmap.create({
      data: {
        workspaceId,
        planId: dto.planId || null,
        title: dto.title.trim(),
        description: dto.description || null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate
          ? new Date(dto.endDate)
          : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
      include: {
        phases: {
          include: { milestones: true },
        },
        milestones: true,
      },
    });

    return this.mapRoadmapDto(roadmap);
  }

  async updateRoadmap(
    workspaceId: string,
    roadmapId: string,
    dto: UpdateStrategicRoadmapRequest,
  ): Promise<StrategicRoadmapDto> {
    await this.verifyRoadmapAccess(workspaceId, roadmapId);

    const updated = await this.prisma.strategicRoadmap.update({
      where: { id: roadmapId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
      include: {
        phases: {
          include: { milestones: true },
        },
        milestones: true,
      },
    });

    return this.mapRoadmapDto(updated);
  }

  async deleteRoadmap(workspaceId: string, roadmapId: string): Promise<void> {
    await this.verifyRoadmapAccess(workspaceId, roadmapId);
    await this.prisma.strategicRoadmap.delete({ where: { id: roadmapId } });
  }

  async createPhase(workspaceId: string, roadmapId: string, dto: CreateRoadmapPhaseRequest) {
    await this.verifyRoadmapAccess(workspaceId, roadmapId);

    return this.prisma.roadmapPhase.create({
      data: {
        roadmapId,
        name: dto.name.trim(),
        description: dto.description || null,
        phaseOrder: dto.phaseOrder || 1,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status || 'NOT_STARTED',
      },
    });
  }

  async updatePhase(workspaceId: string, phaseId: string, dto: Partial<CreateRoadmapPhaseRequest>) {
    const phase = await this.prisma.roadmapPhase.findUnique({
      where: { id: phaseId },
      include: { roadmap: true },
    });
    if (!phase || phase.roadmap.workspaceId !== workspaceId) {
      throw new NotFoundException('Roadmap Phase not found in this workspace');
    }

    return this.prisma.roadmapPhase.update({
      where: { id: phaseId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.phaseOrder !== undefined && { phaseOrder: dto.phaseOrder }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async deletePhase(workspaceId: string, phaseId: string): Promise<void> {
    const phase = await this.prisma.roadmapPhase.findUnique({
      where: { id: phaseId },
      include: { roadmap: true },
    });
    if (!phase || phase.roadmap.workspaceId !== workspaceId) {
      throw new NotFoundException('Roadmap Phase not found in this workspace');
    }
    await this.prisma.roadmapPhase.delete({ where: { id: phaseId } });
  }

  async listMilestones(
    workspaceId: string,
    params?: { roadmapId?: string; status?: string },
  ): Promise<RoadmapMilestoneDto[]> {
    const where: any = { workspaceId };
    if (params?.roadmapId) where.roadmapId = params.roadmapId;
    if (params?.status) where.status = params.status;

    const milestones = await this.prisma.roadmapMilestone.findMany({
      where,
      orderBy: { targetDate: 'asc' },
    });

    const now = new Date();
    return milestones.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      roadmapId: m.roadmapId,
      phaseId: m.phaseId,
      title: m.title,
      description: m.description,
      targetDate: m.targetDate.toISOString(),
      status: m.status,
      successCriteria: m.successCriteria,
      isOverdue: m.status !== 'COMPLETED' && m.targetDate < now,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  async createMilestone(
    workspaceId: string,
    dto: CreateRoadmapMilestoneRequest,
  ): Promise<RoadmapMilestoneDto> {
    await this.verifyRoadmapAccess(workspaceId, dto.roadmapId);

    const milestone = await this.prisma.roadmapMilestone.create({
      data: {
        workspaceId,
        roadmapId: dto.roadmapId,
        phaseId: dto.phaseId || null,
        title: dto.title.trim(),
        description: dto.description || null,
        targetDate: new Date(dto.targetDate),
        status: dto.status || 'PENDING',
        successCriteria: dto.successCriteria || null,
      },
    });

    const isOverdue = milestone.status !== 'COMPLETED' && milestone.targetDate < new Date();
    return {
      id: milestone.id,
      workspaceId: milestone.workspaceId,
      roadmapId: milestone.roadmapId,
      phaseId: milestone.phaseId,
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.targetDate.toISOString(),
      status: milestone.status,
      successCriteria: milestone.successCriteria,
      isOverdue,
      createdAt: milestone.createdAt.toISOString(),
      updatedAt: milestone.updatedAt.toISOString(),
    };
  }

  async updateMilestone(
    workspaceId: string,
    milestoneId: string,
    dto: UpdateRoadmapMilestoneRequest,
  ): Promise<RoadmapMilestoneDto> {
    const milestone = await this.prisma.roadmapMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone || milestone.workspaceId !== workspaceId) {
      throw new NotFoundException('Milestone not found in this workspace');
    }

    const updated = await this.prisma.roadmapMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.successCriteria !== undefined && { successCriteria: dto.successCriteria }),
      },
    });

    const isOverdue = updated.status !== 'COMPLETED' && updated.targetDate < new Date();
    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      roadmapId: updated.roadmapId,
      phaseId: updated.phaseId,
      title: updated.title,
      description: updated.description,
      targetDate: updated.targetDate.toISOString(),
      status: updated.status,
      successCriteria: updated.successCriteria,
      isOverdue,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteMilestone(workspaceId: string, milestoneId: string): Promise<void> {
    const milestone = await this.prisma.roadmapMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone || milestone.workspaceId !== workspaceId) {
      throw new NotFoundException('Milestone not found in this workspace');
    }
    await this.prisma.roadmapMilestone.delete({ where: { id: milestoneId } });
  }

  // ===========================================================================
  // 6. Strategy Reviews
  // ===========================================================================

  async listReviews(workspaceId: string, planId?: string): Promise<StrategyReviewDto[]> {
    const where: any = { workspaceId };
    if (planId) where.planId = planId;

    const reviews = await this.prisma.strategyReview.findMany({
      where,
      orderBy: { reviewDate: 'desc' },
    });

    return reviews.map((rv) => this.mapReviewDto(rv));
  }

  async getReview(workspaceId: string, reviewId: string): Promise<StrategyReviewDto> {
    const review = await this.prisma.strategyReview.findUnique({
      where: { id: reviewId },
    });
    if (!review || review.workspaceId !== workspaceId) {
      throw new NotFoundException('Strategy Review not found in this workspace');
    }
    return this.mapReviewDto(review);
  }

  async createReview(
    workspaceId: string,
    userId: string,
    dto: CreateStrategyReviewRequest,
  ): Promise<StrategyReviewDto> {
    await this.verifyPlanAccess(workspaceId, dto.planId);

    const review = await this.prisma.strategyReview.create({
      data: {
        workspaceId,
        planId: dto.planId,
        conductedById: userId,
        period: (dto.period as ReviewPeriod) || ReviewPeriod.MONTHLY,
        status: (dto.status as ReviewStatus) || ReviewStatus.COMPLETED,
        summary: dto.summary.trim(),
        goalsReviewed: dto.goalsReviewed || null,
        initiativesReviewed: dto.initiativesReviewed || null,
        blockersIdentified: dto.blockersIdentified || [],
        changedAssumptions: dto.changedAssumptions || [],
        aiRecommendations: dto.aiRecommendations || [],
        strategicAdjustments: dto.strategicAdjustments || [],
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : new Date(),
      },
    });

    return this.mapReviewDto(review);
  }

  async updateReview(
    workspaceId: string,
    reviewId: string,
    dto: Partial<CreateStrategyReviewRequest>,
  ): Promise<StrategyReviewDto> {
    const existing = await this.prisma.strategyReview.findUnique({ where: { id: reviewId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException('Strategy Review not found in this workspace');
    }

    const updated = await this.prisma.strategyReview.update({
      where: { id: reviewId },
      data: {
        ...(dto.summary && { summary: dto.summary.trim() }),
        ...(dto.period && { period: dto.period as ReviewPeriod }),
        ...(dto.status && { status: dto.status as ReviewStatus }),
        ...(dto.blockersIdentified && { blockersIdentified: dto.blockersIdentified }),
        ...(dto.changedAssumptions && { changedAssumptions: dto.changedAssumptions }),
        ...(dto.aiRecommendations && { aiRecommendations: dto.aiRecommendations }),
        ...(dto.strategicAdjustments && { strategicAdjustments: dto.strategicAdjustments }),
      },
    });

    return this.mapReviewDto(updated);
  }

  async deleteReview(workspaceId: string, reviewId: string): Promise<void> {
    const existing = await this.prisma.strategyReview.findUnique({ where: { id: reviewId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException('Strategy Review not found in this workspace');
    }
    await this.prisma.strategyReview.delete({ where: { id: reviewId } });
  }

  // ===========================================================================
  // 7. Planning Recommendations
  // ===========================================================================

  async listRecommendations(
    workspaceId: string,
    planId?: string,
  ): Promise<PlanningRecommendationDto[]> {
    const where: any = { workspaceId };
    if (planId) where.planId = planId;

    const recs = await this.prisma.planningRecommendation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return recs.map((r) => this.mapRecommendationDto(r));
  }

  async actionRecommendation(
    workspaceId: string,
    recommendationId: string,
  ): Promise<PlanningRecommendationDto> {
    const rec = await this.prisma.planningRecommendation.findUnique({
      where: { id: recommendationId },
    });
    if (!rec || rec.workspaceId !== workspaceId) {
      throw new NotFoundException('Recommendation not found in this workspace');
    }

    const updated = await this.prisma.planningRecommendation.update({
      where: { id: recommendationId },
      data: {
        isActioned: true,
        actionedAt: new Date(),
      },
    });

    return this.mapRecommendationDto(updated);
  }

  // ===========================================================================
  // Verification & Access Helpers
  // ===========================================================================

  private async verifyPlanAccess(workspaceId: string, planId: string) {
    const plan = await this.prisma.strategicPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.workspaceId !== workspaceId) {
      throw new NotFoundException(`Strategic Plan ${planId} not found in this workspace`);
    }
    return plan;
  }

  private async verifyGoalAccess(workspaceId: string, goalId: string) {
    const goal = await this.prisma.businessGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.workspaceId !== workspaceId) {
      throw new NotFoundException(`Business Goal ${goalId} not found in this workspace`);
    }
    return goal;
  }

  private async verifyInitiativeAccess(workspaceId: string, initiativeId: string) {
    const init = await this.prisma.strategicInitiative.findUnique({ where: { id: initiativeId } });
    if (!init || init.workspaceId !== workspaceId) {
      throw new NotFoundException(`Strategic Initiative ${initiativeId} not found in this workspace`);
    }
    return init;
  }

  private async verifyRoadmapAccess(workspaceId: string, roadmapId: string) {
    const rm = await this.prisma.strategicRoadmap.findUnique({ where: { id: roadmapId } });
    if (!rm || rm.workspaceId !== workspaceId) {
      throw new NotFoundException(`Strategic Roadmap ${roadmapId} not found in this workspace`);
    }
    return rm;
  }

  // ===========================================================================
  // DTO Mappers
  // ===========================================================================

  private mapPlanDto(p: any): StrategicPlanDto {
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      createdById: p.createdById,
      title: p.title,
      planType: p.planType,
      businessStage: p.businessStage,
      targetMarket: p.targetMarket,
      targetAudience: p.targetAudience,
      horizonMonths: p.horizonMonths,
      budgetRange: p.budgetRange,
      teamSize: p.teamSize,
      status: p.status as PlanStatus,
      executiveSummary: p.executiveSummary,
      currentSituation: p.currentSituation,
      marketPositioning: p.marketPositioning,
      strategicObjectives: p.strategicObjectives || [],
      requiredResources: p.requiredResources || [],
      budgetAssumptions: p.budgetAssumptions || [],
      risksAndMitigations: p.risksAndMitigations,
      dependencies: p.dependencies || [],
      timelineAssumptions: p.timelineAssumptions || [],
      successMetrics: p.successMetrics || [],
      validationRequirements: p.validationRequirements || [],
      nextRecommendedActions: p.nextRecommendedActions || [],
      confidenceScore: p.confidenceScore,
      researchId: p.researchId,
      opportunityId: p.opportunityId,
      currentVersionNumber: p.currentVersionNumber,
      goalsCount: p._count?.goals,
      initiativesCount: p._count?.initiatives,
      roadmapsCount: p._count?.roadmaps,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private mapGoalDto(g: any): BusinessGoalDto {
    const targetVal = Number(g.targetValue) || 100;
    const currentVal = Number(g.currentValue) || 0;
    const progressPercent =
      targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;

    return {
      id: g.id,
      workspaceId: g.workspaceId,
      planId: g.planId,
      title: g.title,
      description: g.description,
      category: g.category as GoalCategory,
      targetValue: targetVal,
      currentValue: currentVal,
      unit: g.unit,
      progressPercent,
      startDate: g.startDate ? g.startDate.toISOString() : null,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      status: g.status as GoalStatus,
      priority: g.priority as GoalPriority,
      measurementFrequency: g.measurementFrequency,
      isQualitative: g.isQualitative,
      assignedOwnerId: g.assignedOwnerId,
      progressRecords: g.progressRecords?.map((r: any) => ({
        id: r.id,
        goalId: r.goalId,
        recordedById: r.recordedById,
        previousValue: r.previousValue,
        newValue: r.newValue,
        note: r.note,
        isExternalMeasurement: r.isExternalMeasurement,
        recordedAt: r.recordedAt.toISOString(),
      })),
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }

  private mapInitiativeDto(i: any): StrategicInitiativeDto {
    return {
      id: i.id,
      workspaceId: i.workspaceId,
      planId: i.planId,
      goalId: i.goalId,
      opportunityId: i.opportunityId,
      roadmapPhaseId: i.roadmapPhaseId,
      name: i.name,
      description: i.description,
      strategicRationale: i.strategicRationale,
      priority: i.priority as InitiativePriority,
      status: i.status as InitiativeStatus,
      expectedImpact: i.expectedImpact,
      estimatedEffort: i.estimatedEffort,
      estimatedCost: i.estimatedCost,
      risks: i.risks || [],
      recommendedActions: i.recommendedActions || [],
      evidenceReferences: i.evidenceReferences,
      evidenceType: i.evidenceType as EvidenceType,
      ownerId: i.ownerId,
      projectId: i.projectId,
      convertedAt: i.convertedAt ? i.convertedAt.toISOString() : null,
      dependencies: (i.outgoingDependencies || i.dependencies)?.map((d: any) => ({
        id: d.id,
        initiativeId: d.initiativeId,
        dependsOnId: d.dependsOnId,
        dependencyType: d.dependencyType,
        dependsOnInitiative: d.dependsOn || d.dependsOnInitiative,
        createdAt: d.createdAt.toISOString(),
      })),
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    };
  }

  private mapRoadmapDto(r: any): StrategicRoadmapDto {
    const now = new Date();
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      planId: r.planId,
      title: r.title,
      description: r.description,
      startDate: r.startDate ? r.startDate.toISOString() : null,
      endDate: r.endDate ? r.endDate.toISOString() : null,
      phases:
        r.phases?.map((ph: any) => ({
          id: ph.id,
          roadmapId: ph.roadmapId,
          name: ph.name,
          description: ph.description,
          phaseOrder: ph.phaseOrder,
          startDate: ph.startDate ? ph.startDate.toISOString() : null,
          endDate: ph.endDate ? ph.endDate.toISOString() : null,
          status: ph.status,
          milestones: ph.milestones?.map((m: any) => ({
            id: m.id,
            workspaceId: m.workspaceId,
            roadmapId: m.roadmapId,
            phaseId: m.phaseId,
            title: m.title,
            description: m.description,
            targetDate: m.targetDate.toISOString(),
            status: m.status,
            successCriteria: m.successCriteria,
            isOverdue: m.status !== 'COMPLETED' && m.targetDate < now,
            createdAt: m.createdAt.toISOString(),
            updatedAt: m.updatedAt.toISOString(),
          })),
          createdAt: ph.createdAt.toISOString(),
          updatedAt: ph.updatedAt.toISOString(),
        })) || [],
      milestones:
        r.milestones?.map((m: any) => ({
          id: m.id,
          workspaceId: m.workspaceId,
          roadmapId: m.roadmapId,
          phaseId: m.phaseId,
          title: m.title,
          description: m.description,
          targetDate: m.targetDate.toISOString(),
          status: m.status,
          successCriteria: m.successCriteria,
          isOverdue: m.status !== 'COMPLETED' && m.targetDate < now,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })) || [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private mapReviewDto(rv: any): StrategyReviewDto {
    return {
      id: rv.id,
      workspaceId: rv.workspaceId,
      planId: rv.planId,
      conductedById: rv.conductedById,
      period: rv.period as ReviewPeriod,
      status: rv.status as ReviewStatus,
      summary: rv.summary,
      goalsReviewed: rv.goalsReviewed,
      initiativesReviewed: rv.initiativesReviewed,
      blockersIdentified: rv.blockersIdentified || [],
      changedAssumptions: rv.changedAssumptions || [],
      aiRecommendations: rv.aiRecommendations || [],
      strategicAdjustments: rv.strategicAdjustments || [],
      reviewDate: rv.reviewDate.toISOString(),
      createdAt: rv.createdAt.toISOString(),
      updatedAt: rv.updatedAt.toISOString(),
    };
  }

  private mapRecommendationDto(rec: any): PlanningRecommendationDto {
    return {
      id: rec.id,
      workspaceId: rec.workspaceId,
      planId: rec.planId,
      title: rec.title,
      recommendation: rec.recommendation,
      category: rec.category,
      impact: rec.impact,
      urgency: rec.urgency,
      evidenceType: rec.evidenceType as EvidenceType,
      isActioned: rec.isActioned,
      actionedAt: rec.actionedAt ? rec.actionedAt.toISOString() : null,
      createdAt: rec.createdAt.toISOString(),
    };
  }
}
