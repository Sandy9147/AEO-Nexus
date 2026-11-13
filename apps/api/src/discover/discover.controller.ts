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
import { DiscoverService } from './discover.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateResearchProjectRequest,
  CreateResearchProjectSchema,
  CreateCompetitorRequest,
  CreateCompetitorSchema,
  UpdateCompetitorRequest,
  UpdateCompetitorSchema,
  CreateAudienceProfileRequest,
  CreateAudienceProfileSchema,
  UpdateAudienceProfileRequest,
  UpdateAudienceProfileSchema,
  CreateMarketOpportunityRequest,
  CreateMarketOpportunitySchema,
  UpdateMarketOpportunityRequest,
  UpdateMarketOpportunitySchema,
  CreateAEOResearchQuestionRequest,
  CreateAEOResearchQuestionSchema,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId/discover')
@UseGuards(JwtAuthGuard)
export class DiscoverController {
  constructor(
    private readonly discoverService: DiscoverService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // 1. Overview
  @Get('overview')
  async getOverview(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.getOverview(workspaceId);
  }

  // 2. Research Projects
  @Get('research')
  async listResearch(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listResearch(workspaceId);
  }

  @Post('research')
  async createResearch(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateResearchProjectRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateResearchProjectSchema.parse(body);
    return this.discoverService.createResearch(workspaceId, req.user.id, validated);
  }

  @Get('research/:researchId')
  async getResearchDetail(
    @Param('workspaceId') workspaceId: string,
    @Param('researchId') researchId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.getResearchDetail(workspaceId, researchId);
  }

  @Post('research/:researchId/cancel')
  async cancelResearch(
    @Param('workspaceId') workspaceId: string,
    @Param('researchId') researchId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.cancelResearch(workspaceId, researchId);
  }

  @Post('research/:researchId/rerun')
  async rerunResearch(
    @Param('workspaceId') workspaceId: string,
    @Param('researchId') researchId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.rerunResearch(workspaceId, req.user.id, researchId);
  }

  @Delete('research/:researchId')
  async deleteResearch(
    @Param('workspaceId') workspaceId: string,
    @Param('researchId') researchId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.deleteResearch(workspaceId, researchId);
  }

  // 3. Market Opportunities
  @Get('opportunities')
  async listOpportunities(
    @Param('workspaceId') workspaceId: string,
    @Query('researchId') researchId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listOpportunities(workspaceId, researchId);
  }

  @Post('opportunities')
  async createOpportunity(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateMarketOpportunityRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateMarketOpportunitySchema.parse(body);
    return this.discoverService.createOpportunity(workspaceId, validated);
  }

  @Patch('opportunities/:opportunityId')
  async updateOpportunity(
    @Param('workspaceId') workspaceId: string,
    @Param('opportunityId') opportunityId: string,
    @Body() body: UpdateMarketOpportunityRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateMarketOpportunitySchema.parse(body);
    return this.discoverService.updateOpportunity(workspaceId, opportunityId, validated);
  }

  @Delete('opportunities/:opportunityId')
  async deleteOpportunity(
    @Param('workspaceId') workspaceId: string,
    @Param('opportunityId') opportunityId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.deleteOpportunity(workspaceId, opportunityId);
  }

  // 4. Competitors
  @Get('competitors')
  async listCompetitors(
    @Param('workspaceId') workspaceId: string,
    @Query('researchId') researchId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listCompetitors(workspaceId, researchId);
  }

  @Post('competitors')
  async createCompetitor(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateCompetitorRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateCompetitorSchema.parse(body);
    return this.discoverService.createCompetitor(workspaceId, validated);
  }

  @Patch('competitors/:competitorId')
  async updateCompetitor(
    @Param('workspaceId') workspaceId: string,
    @Param('competitorId') competitorId: string,
    @Body() body: UpdateCompetitorRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateCompetitorSchema.parse(body);
    return this.discoverService.updateCompetitor(workspaceId, competitorId, validated);
  }

  @Delete('competitors/:competitorId')
  async deleteCompetitor(
    @Param('workspaceId') workspaceId: string,
    @Param('competitorId') competitorId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.deleteCompetitor(workspaceId, competitorId);
  }

  // 5. Audience Profiles
  @Get('audience')
  async listAudienceProfiles(
    @Param('workspaceId') workspaceId: string,
    @Query('researchId') researchId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listAudienceProfiles(workspaceId, researchId);
  }

  @Post('audience')
  async createAudienceProfile(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateAudienceProfileRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateAudienceProfileSchema.parse(body);
    return this.discoverService.createAudienceProfile(workspaceId, validated);
  }

  @Patch('audience/:profileId')
  async updateAudienceProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
    @Body() body: UpdateAudienceProfileRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateAudienceProfileSchema.parse(body);
    return this.discoverService.updateAudienceProfile(workspaceId, profileId, validated);
  }

  @Delete('audience/:profileId')
  async deleteAudienceProfile(
    @Param('workspaceId') workspaceId: string,
    @Param('profileId') profileId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.deleteAudienceProfile(workspaceId, profileId);
  }

  // 6. Market Trends
  @Get('market-trends')
  async listMarketTrends(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listMarketTrends(workspaceId);
  }

  // 7. AEO Research
  @Get('aeo-research')
  async listAEOResearch(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listAEOResearch(workspaceId);
  }

  @Post('aeo-research')
  async createAEOResearchQuestion(
    @Param('workspaceId') workspaceId: string,
    @Body() body: CreateAEOResearchQuestionRequest,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateAEOResearchQuestionSchema.parse(body);
    return this.discoverService.createAEOResearchQuestion(workspaceId, validated);
  }

  // 8. Reports
  @Get('reports')
  async listReports(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.discoverService.listReports(workspaceId);
  }
}
