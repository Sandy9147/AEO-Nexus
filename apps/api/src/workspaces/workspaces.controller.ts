import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { CreateWorkspaceRequest } from '@aeo-nexus/contracts';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async listWorkspaces(@Req() req: RequestWithUser) {
    const list = await this.workspacesService.listUserWorkspaces(req.user.id);
    return {
      success: true,
      data: list,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  async createWorkspace(@Req() req: RequestWithUser, @Body() body: CreateWorkspaceRequest) {
    const created = await this.workspacesService.createWorkspace(req.user.id, body);
    return {
      success: true,
      data: created,
      timestamp: new Date().toISOString(),
    };
  }
}
