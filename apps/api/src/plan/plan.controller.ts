import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { PlanService } from './plan.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateStrategicPlanRequest,
  CreateStrategicPlanSchema,
  GenerateStrategicPlanRequest,
  GenerateStrategicPlanSchema,
  UpdateStrategicPlanRequest,
  UpdateStrategicPlanSchema,
  CreateBusinessGoalRequest,
  CreateBusinessGoalSchema,
  UpdateBusinessGoalRequest,
  UpdateBusinessGoalSchema,
  RecordGoalProgressRequest,
  RecordGoalProgressSchema,
  CreateStrategicInitiativeRequest,
  CreateStrategicInitiativeSchema,
  UpdateStrategicInitiativeRequest,
  UpdateStrategicInitiativeSchema,
  ConvertInitiativeToProjectRequest,
  ConvertInitiativeToProjectSchema,
  CreateInitiativeDependencyRequest,
  CreateInitiativeDependencySchema,
  CreateStrategicRoadmapRequest,
  CreateStrategicRoadmapSchema,
  UpdateStrategicRoadmapRequest,
  UpdateStrategicRoadmapSchema,
  CreateRoadmapPhaseRequest,
  CreateRoadmapPhaseSchema,
  CreateRoadmapMilestoneRequest,
  CreateRoadmapMilestoneSchema,
  UpdateRoadmapMilestoneRequest,
  UpdateRoadmapMilestoneSchema,
  CreateStrategyReviewRequest,
  CreateStrategyReviewSchema,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId/plan')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ===========================================================================
  // 1. Overview
  // ===========================================================================

  @Get('overview')
  async getOverview(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.getOverview(workspaceId);
  }

  // ===========================================================================
  // 2. Strategic Plans
  // ===========================================================================

  @Get('strategies')
  async listPlans(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listPlans(workspaceId, { status, search });
  }

  @Post('strategies')
  async createPlan(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateStrategicPlanRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateStrategicPlanSchema.parse(body);
    return this.planService.createPlan(workspaceId, req.user.id, validated);
  }

  @Post('strategies/generate')
  async generatePlan(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: GenerateStrategicPlanRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = GenerateStrategicPlanSchema.parse(body);
    return this.planService.generatePlan(workspaceId, req.user.id, validated);
  }

  @Get('strategies/:planId')
  async getPlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.getPlan(workspaceId, planId);
  }

  @Patch('strategies/:planId')
  async updatePlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateStrategicPlanRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateStrategicPlanSchema.parse(body);
    return this.planService.updatePlan(workspaceId, planId, validated);
  }

  @Post('strategies/:planId/approve')
  async approvePlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.approvePlan(workspaceId, planId, req.user.id);
  }

  @Delete('strategies/:planId')
  async deletePlan(
    @Param('workspaceId') workspaceId: string,
    @Param('planId') planId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deletePlan(workspaceId, planId);
  }

  // ===========================================================================
  // 3. Business Goals & KPI Progress Tracking
  // ===========================================================================

  @Get('goals')
  async listGoals(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('planId') planId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listGoals(workspaceId, { planId, category, status });
  }

  @Post('goals')
  async createGoal(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateBusinessGoalRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateBusinessGoalSchema.parse(body);
    return this.planService.createGoal(workspaceId, req.user.id, validated);
  }

  @Get('goals/:goalId')
  async getGoal(
    @Param('workspaceId') workspaceId: string,
    @Param('goalId') goalId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.getGoal(workspaceId, goalId);
  }

  @Patch('goals/:goalId')
  async updateGoal(
    @Param('workspaceId') workspaceId: string,
    @Param('goalId') goalId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateBusinessGoalRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateBusinessGoalSchema.parse(body);
    return this.planService.updateGoal(workspaceId, goalId, validated);
  }

  @Post('goals/:goalId/progress')
  async recordGoalProgress(
    @Param('workspaceId') workspaceId: string,
    @Param('goalId') goalId: string,
    @Req() req: RequestWithUser,
    @Body() body: RecordGoalProgressRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = RecordGoalProgressSchema.parse(body);
    return this.planService.recordGoalProgress(workspaceId, goalId, req.user.id, validated);
  }

  @Delete('goals/:goalId')
  async deleteGoal(
    @Param('workspaceId') workspaceId: string,
    @Param('goalId') goalId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deleteGoal(workspaceId, goalId);
  }

  // ===========================================================================
  // 4. Strategic Initiatives & Dependencies
  // ===========================================================================

  @Get('initiatives')
  async listInitiatives(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('planId') planId?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listInitiatives(workspaceId, { planId, priority, status });
  }

  @Post('initiatives')
  async createInitiative(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateStrategicInitiativeRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateStrategicInitiativeSchema.parse(body);
    return this.planService.createInitiative(workspaceId, req.user.id, validated);
  }

  @Get('initiatives/:initiativeId')
  async getInitiative(
    @Param('workspaceId') workspaceId: string,
    @Param('initiativeId') initiativeId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.getInitiative(workspaceId, initiativeId);
  }

  @Patch('initiatives/:initiativeId')
  async updateInitiative(
    @Param('workspaceId') workspaceId: string,
    @Param('initiativeId') initiativeId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateStrategicInitiativeRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateStrategicInitiativeSchema.parse(body);
    return this.planService.updateInitiative(workspaceId, initiativeId, validated);
  }

  @Delete('initiatives/:initiativeId')
  async deleteInitiative(
    @Param('workspaceId') workspaceId: string,
    @Param('initiativeId') initiativeId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deleteInitiative(workspaceId, initiativeId);
  }

  @Post('initiatives/:initiativeId/dependencies')
  async addDependency(
    @Param('workspaceId') workspaceId: string,
    @Param('initiativeId') initiativeId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateInitiativeDependencyRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateInitiativeDependencySchema.parse(body);
    return this.planService.addDependency(workspaceId, initiativeId, validated);
  }

  @Delete('initiatives/:initiativeId/dependencies/:dependencyId')
  async removeDependency(
    @Param('workspaceId') workspaceId: string,
    @Param('initiativeId') initiativeId: string,
    @Param('dependencyId') dependencyId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.removeDependency(workspaceId, initiativeId, dependencyId);
  }

  @Post('initiatives/:initiativeId/convert-to-project')
  async convertInitiativeToProject(
    @Param('workspaceId') workspaceId: string,
    @Param('initiativeId') initiativeId: string,
    @Req() req: RequestWithUser,
    @Body() body: ConvertInitiativeToProjectRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = ConvertInitiativeToProjectSchema.parse(body);
    return this.planService.convertInitiativeToProject(workspaceId, initiativeId, req.user.id, validated);
  }

  // ===========================================================================
  // 5. Strategic Roadmaps, Phases & Milestones
  // ===========================================================================

  @Get('roadmaps')
  async listRoadmaps(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('planId') planId?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listRoadmaps(workspaceId, planId);
  }

  @Post('roadmaps')
  async createRoadmap(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateStrategicRoadmapRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateStrategicRoadmapSchema.parse(body);
    return this.planService.createRoadmap(workspaceId, validated);
  }

  @Get('roadmaps/:roadmapId')
  async getRoadmap(
    @Param('workspaceId') workspaceId: string,
    @Param('roadmapId') roadmapId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.getRoadmap(workspaceId, roadmapId);
  }

  @Patch('roadmaps/:roadmapId')
  async updateRoadmap(
    @Param('workspaceId') workspaceId: string,
    @Param('roadmapId') roadmapId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateStrategicRoadmapRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateStrategicRoadmapSchema.parse(body);
    return this.planService.updateRoadmap(workspaceId, roadmapId, validated);
  }

  @Delete('roadmaps/:roadmapId')
  async deleteRoadmap(
    @Param('workspaceId') workspaceId: string,
    @Param('roadmapId') roadmapId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deleteRoadmap(workspaceId, roadmapId);
  }

  @Post('roadmaps/:roadmapId/phases')
  async createPhase(
    @Param('workspaceId') workspaceId: string,
    @Param('roadmapId') roadmapId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateRoadmapPhaseRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateRoadmapPhaseSchema.parse(body);
    return this.planService.createPhase(workspaceId, roadmapId, validated);
  }

  @Patch('phases/:phaseId')
  async updatePhase(
    @Param('workspaceId') workspaceId: string,
    @Param('phaseId') phaseId: string,
    @Req() req: RequestWithUser,
    @Body() body: Partial<CreateRoadmapPhaseRequest>,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.updatePhase(workspaceId, phaseId, body);
  }

  @Delete('phases/:phaseId')
  async deletePhase(
    @Param('workspaceId') workspaceId: string,
    @Param('phaseId') phaseId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deletePhase(workspaceId, phaseId);
  }

  @Get('milestones')
  async listMilestones(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('roadmapId') roadmapId?: string,
    @Query('status') status?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listMilestones(workspaceId, { roadmapId, status });
  }

  @Post('milestones')
  async createMilestone(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateRoadmapMilestoneRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateRoadmapMilestoneSchema.parse(body);
    return this.planService.createMilestone(workspaceId, validated);
  }

  @Patch('milestones/:milestoneId')
  async updateMilestone(
    @Param('workspaceId') workspaceId: string,
    @Param('milestoneId') milestoneId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateRoadmapMilestoneRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateRoadmapMilestoneSchema.parse(body);
    return this.planService.updateMilestone(workspaceId, milestoneId, validated);
  }

  @Delete('milestones/:milestoneId')
  async deleteMilestone(
    @Param('workspaceId') workspaceId: string,
    @Param('milestoneId') milestoneId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deleteMilestone(workspaceId, milestoneId);
  }

  // ===========================================================================
  // 6. Strategy Reviews
  // ===========================================================================

  @Get('reviews')
  async listReviews(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('planId') planId?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listReviews(workspaceId, planId);
  }

  @Post('reviews')
  async createReview(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateStrategyReviewRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateStrategyReviewSchema.parse(body);
    return this.planService.createReview(workspaceId, req.user.id, validated);
  }

  @Get('reviews/:reviewId')
  async getReview(
    @Param('workspaceId') workspaceId: string,
    @Param('reviewId') reviewId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.getReview(workspaceId, reviewId);
  }

  @Patch('reviews/:reviewId')
  async updateReview(
    @Param('workspaceId') workspaceId: string,
    @Param('reviewId') reviewId: string,
    @Req() req: RequestWithUser,
    @Body() body: Partial<CreateStrategyReviewRequest>,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.updateReview(workspaceId, reviewId, body);
  }

  @Delete('reviews/:reviewId')
  async deleteReview(
    @Param('workspaceId') workspaceId: string,
    @Param('reviewId') reviewId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.deleteReview(workspaceId, reviewId);
  }

  // ===========================================================================
  // 7. Planning Recommendations
  // ===========================================================================

  @Get('recommendations')
  async listRecommendations(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('planId') planId?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.listRecommendations(workspaceId, planId);
  }

  @Post('recommendations/:recommendationId/action')
  async actionRecommendation(
    @Param('workspaceId') workspaceId: string,
    @Param('recommendationId') recommendationId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.planService.actionRecommendation(workspaceId, recommendationId);
  }
}

