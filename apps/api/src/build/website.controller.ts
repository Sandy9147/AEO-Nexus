import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { WebsiteService } from './website.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateWebsiteProjectRequest,
  CreateWebsiteProjectSchema,
  GenerateWebsiteRequest,
  GenerateWebsiteSchema,
  UpdateWebsiteProjectRequest,
  UpdateWebsiteProjectSchema,
  UpdateWebsiteThemeRequest,
  UpdateWebsiteThemeSchema,
  CreateWebsitePageRequest,
  CreateWebsitePageSchema,
  UpdateWebsitePageRequest,
  UpdateWebsitePageSchema,
  SavePageSectionsRequest,
  SavePageSectionsSchema,
  RegenerateSectionRequest,
  RegenerateSectionSchema,
  PublishWebsiteRequest,
  PublishWebsiteSchema,
} from '@aeo-nexus/contracts';

@Controller('workspaces/:workspaceId/build')
@UseGuards(JwtAuthGuard)
export class WebsiteController {
  constructor(
    private readonly websiteService: WebsiteService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ---------------------------------------------------------------------------
  // Overview & Listing
  // ---------------------------------------------------------------------------

  @Get('overview')
  async getOverview(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.getOverview(workspaceId);
  }

  @Get('websites')
  async listWebsites(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.listWebsites(workspaceId, status);
  }

  // ---------------------------------------------------------------------------
  // Project Lifecycle
  // ---------------------------------------------------------------------------

  @Post('websites')
  async createWebsite(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateWebsiteProjectRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateWebsiteProjectSchema.parse(body);
    return this.websiteService.createWebsite(workspaceId, req.user.id, validated);
  }

  @Post('websites/generate')
  async generateWebsite(
    @Param('workspaceId') workspaceId: string,
    @Req() req: RequestWithUser,
    @Body() body: GenerateWebsiteRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = GenerateWebsiteSchema.parse(body);
    return this.websiteService.generateWebsite(workspaceId, req.user.id, validated);
  }

  @Get('websites/:websiteId')
  async getWebsite(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.getWebsite(workspaceId, websiteId);
  }

  @Patch('websites/:websiteId')
  async updateWebsite(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateWebsiteProjectRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateWebsiteProjectSchema.parse(body);
    return this.websiteService.updateWebsite(workspaceId, websiteId, validated);
  }

  @Delete('websites/:websiteId')
  async deleteWebsite(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.deleteWebsite(workspaceId, websiteId);
  }

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------

  @Patch('websites/:websiteId/theme')
  async updateTheme(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateWebsiteThemeRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateWebsiteThemeSchema.parse(body);
    return this.websiteService.updateTheme(workspaceId, websiteId, validated);
  }

  // ---------------------------------------------------------------------------
  // Pages & Sections
  // ---------------------------------------------------------------------------

  @Post('websites/:websiteId/pages')
  async createPage(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
    @Body() body: CreateWebsitePageRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = CreateWebsitePageSchema.parse(body);
    return this.websiteService.createPage(workspaceId, websiteId, validated);
  }

  @Patch('websites/:websiteId/pages/:pageId')
  async updatePage(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Param('pageId') pageId: string,
    @Req() req: RequestWithUser,
    @Body() body: UpdateWebsitePageRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = UpdateWebsitePageSchema.parse(body);
    return this.websiteService.updatePage(workspaceId, websiteId, pageId, validated);
  }

  @Delete('websites/:websiteId/pages/:pageId')
  async deletePage(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Param('pageId') pageId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.deletePage(workspaceId, websiteId, pageId);
  }

  @Put('websites/:websiteId/pages/:pageId/sections')
  async savePageSections(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Param('pageId') pageId: string,
    @Req() req: RequestWithUser,
    @Body() body: SavePageSectionsRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = SavePageSectionsSchema.parse(body);
    return this.websiteService.savePageSections(workspaceId, websiteId, pageId, validated.sections);
  }

  @Post('websites/:websiteId/pages/:pageId/sections/:sectionId/regenerate')
  async regenerateSection(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Param('pageId') pageId: string,
    @Param('sectionId') sectionId: string,
    @Req() req: RequestWithUser,
    @Body() body: RegenerateSectionRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = RegenerateSectionSchema.parse(body);
    return this.websiteService.regenerateSection(workspaceId, websiteId, pageId, sectionId, validated);
  }

  // ---------------------------------------------------------------------------
  // Versions
  // ---------------------------------------------------------------------------

  @Get('websites/:websiteId/versions')
  async listVersions(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.listVersions(workspaceId, websiteId);
  }

  @Post('websites/:websiteId/versions')
  async createVersion(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
    @Body() body: { title?: string; changeSummary?: string },
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.createVersion(
      workspaceId,
      websiteId,
      req.user.id,
      body.title,
      body.changeSummary,
    );
  }

  @Post('websites/:websiteId/versions/:versionId/restore')
  async restoreVersion(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Param('versionId') versionId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.restoreVersion(workspaceId, websiteId, versionId);
  }

  // ---------------------------------------------------------------------------
  // Publishing
  // ---------------------------------------------------------------------------

  @Post('websites/:websiteId/publish')
  async publishWebsite(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
    @Body() body: PublishWebsiteRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const validated = PublishWebsiteSchema.parse(body);
    return this.websiteService.publishWebsite(workspaceId, websiteId, req.user.id, validated.subdomain);
  }

  @Post('websites/:websiteId/unpublish')
  async unpublishWebsite(
    @Param('workspaceId') workspaceId: string,
    @Param('websiteId') websiteId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    return this.websiteService.unpublishWebsite(workspaceId, websiteId);
  }
}

// ---------------------------------------------------------------------------
// Public Controller (Unauthenticated, Rate Limited Safe Platform Gateway)
// ---------------------------------------------------------------------------

@Controller('public/websites')
export class PublicWebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  @Get(':subdomain')
  async getPublicWebsite(@Param('subdomain') subdomain: string) {
    return this.websiteService.getPublicWebsite(subdomain);
  }
}
