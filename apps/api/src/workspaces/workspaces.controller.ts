import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteWorkspaceMemberRequest,
  UpdateMemberRoleRequest,
} from '@aeo-nexus/contracts';
import { WorkspaceRole } from '@aeo-nexus/permissions';

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

  @Get(':id')
  async getWorkspace(@Req() req: RequestWithUser, @Param('id') workspaceId: string) {
    const detail = await this.workspacesService.getWorkspaceDetails(workspaceId, req.user.id);
    return {
      success: true,
      data: detail,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  async updateWorkspace(
    @Req() req: RequestWithUser,
    @Param('id') workspaceId: string,
    @Body() body: UpdateWorkspaceRequest,
  ) {
    const updated = await this.workspacesService.updateWorkspace(workspaceId, req.user.id, body);
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/invitations')
  async inviteMember(
    @Req() req: RequestWithUser,
    @Param('id') workspaceId: string,
    @Body() body: InviteWorkspaceMemberRequest,
  ) {
    const invitation = await this.workspacesService.inviteMember(workspaceId, req.user.id, body);
    return {
      success: true,
      data: invitation,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/invitations')
  async listInvitations(@Req() req: RequestWithUser, @Param('id') workspaceId: string) {
    const invitations = await this.workspacesService.listInvitations(workspaceId, req.user.id);
    return {
      success: true,
      data: invitations,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id/invitations/:invitationId')
  async cancelInvitation(
    @Req() req: RequestWithUser,
    @Param('id') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    const result = await this.workspacesService.cancelInvitation(
      workspaceId,
      invitationId,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('invitations/:token/accept')
  async acceptInvitation(@Req() req: RequestWithUser, @Param('token') token: string) {
    const result = await this.workspacesService.acceptInvitation(token, req.user.id);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('invitations/:token/decline')
  async declineInvitation(@Param('token') token: string) {
    const result = await this.workspacesService.declineInvitation(token);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/members')
  async listMembers(@Req() req: RequestWithUser, @Param('id') workspaceId: string) {
    const members = await this.workspacesService.listMembers(workspaceId, req.user.id);
    return {
      success: true,
      data: members,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @Req() req: RequestWithUser,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateMemberRoleRequest,
  ) {
    const updated = await this.workspacesService.updateMemberRole(
      workspaceId,
      memberId,
      body.role as WorkspaceRole,
      req.user.id,
    );
    return {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Req() req: RequestWithUser,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    const result = await this.workspacesService.removeMember(
      workspaceId,
      memberId,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
