import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteWorkspaceMemberRequest,
  WorkspaceSummary,
  WorkspaceDetail,
  WorkspaceMemberInfo,
  WorkspaceInvitationInfo,
} from '@aeo-nexus/contracts';
import { WorkspaceRole } from '@aeo-nexus/permissions';
import { generateOpaqueToken, hashToken } from '@aeo-nexus/auth';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Helper: verify user membership and return their role
   */
  async verifyMembership(workspaceId: string, userId: string): Promise<WorkspaceRole> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      include: { workspace: true },
    });

    if (!member || !member.isActive || !member.workspace.isActive) {
      throw new ForbiddenException('Access denied: You are not an active member of this workspace');
    }

    return member.role as WorkspaceRole;
  }

  async listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, isActive: true },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    return memberships
      .filter((m) => m.workspace.isActive)
      .map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        memberCount: m.workspace._count.members,
        createdAt: m.workspace.createdAt.toISOString(),
      }));
  }

  async createWorkspace(userId: string, dto: CreateWorkspaceRequest): Promise<WorkspaceSummary> {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Workspace slug '${slug}' already exists`);
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name.trim(),
        slug,
        members: {
          create: {
            userId,
            role: WorkspaceRole.WORKSPACE_OWNER,
            isActive: true,
          },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId,
        action: 'workspace:create',
        resource: 'workspace',
        details: { name: workspace.name, slug: workspace.slug },
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: WorkspaceRole.WORKSPACE_OWNER,
      memberCount: 1,
      createdAt: workspace.createdAt.toISOString(),
    };
  }

  async getWorkspaceDetails(workspaceId: string, userId: string): Promise<WorkspaceDetail> {
    const currentUserRole = await this.verifyMembership(workspaceId, userId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      isActive: workspace.isActive,
      currentUserRole,
      members: workspace.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt.toISOString(),
      })),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceRequest,
  ): Promise<WorkspaceDetail> {
    const role = await this.verifyMembership(workspaceId, userId);

    if (role !== WorkspaceRole.WORKSPACE_OWNER && role !== WorkspaceRole.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Only workspace owners and administrators can update details');
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
      },
    });

    return this.getWorkspaceDetails(workspaceId, userId);
  }

  async inviteMember(
    workspaceId: string,
    invitedByUserId: string,
    dto: InviteWorkspaceMemberRequest,
  ): Promise<WorkspaceInvitationInfo> {
    const role = await this.verifyMembership(workspaceId, invitedByUserId);

    if (
      role !== WorkspaceRole.WORKSPACE_OWNER &&
      role !== WorkspaceRole.WORKSPACE_ADMIN &&
      role !== WorkspaceRole.WORKSPACE_MANAGER
    ) {
      throw new ForbiddenException('You do not have permission to invite members');
    }

    const email = dto.email.trim().toLowerCase();

    // Check if user is already an active member
    const existingMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email },
        isActive: true,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Invalidate existing pending invitations for this email in this workspace
    await this.prisma.workspaceInvitation.deleteMany({
      where: {
        workspaceId,
        email,
        status: 'PENDING',
      },
    });

    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedByUserId },
    });
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role: dto.role as WorkspaceRole,
        tokenHash,
        invitedById: invitedByUserId,
        status: 'PENDING',
        expiresAt,
      },
    });

    await this.emailService.sendWorkspaceInvitationEmail(
      email,
      inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A workspace administrator',
      workspace ? workspace.name : 'Workspace',
      rawToken,
    );

    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      workspaceName: workspace?.name,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  async listInvitations(workspaceId: string, userId: string): Promise<WorkspaceInvitationInfo[]> {
    await this.verifyMembership(workspaceId, userId);

    const invitations = await this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { workspace: true },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      workspaceId: inv.workspaceId,
      workspaceName: inv.workspace.name,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));
  }

  async cancelInvitation(
    workspaceId: string,
    invitationId: string,
    userId: string,
  ): Promise<{ cancelled: boolean }> {
    const role = await this.verifyMembership(workspaceId, userId);

    if (role !== WorkspaceRole.WORKSPACE_OWNER && role !== WorkspaceRole.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Only owners and admins can cancel invitations');
    }

    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    return { cancelled: true };
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<{ accepted: boolean; workspaceId: string }> {
    if (!token) {
      throw new BadRequestException('Invitation token is required');
    }

    const tokenHash = hashToken(token);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    await this.prisma.$transaction([
      this.prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId,
          },
        },
        create: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
          isActive: true,
        },
        update: {
          role: invitation.role,
          isActive: true,
        },
      }),
      this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return {
      accepted: true,
      workspaceId: invitation.workspaceId,
    };
  }

  async declineInvitation(token: string): Promise<{ declined: boolean }> {
    if (!token) {
      throw new BadRequestException('Invitation token is required');
    }

    const tokenHash = hashToken(token);

    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid invitation token');
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED' },
    });

    return { declined: true };
  }

  async listMembers(workspaceId: string, userId: string): Promise<WorkspaceMemberInfo[]> {
    await this.verifyMembership(workspaceId, userId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, isActive: true },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async updateMemberRole(
    workspaceId: string,
    targetMemberId: string,
    newRole: WorkspaceRole,
    currentUserId: string,
  ): Promise<WorkspaceMemberInfo> {
    const callerRole = await this.verifyMembership(workspaceId, currentUserId);

    if (callerRole !== WorkspaceRole.WORKSPACE_OWNER && callerRole !== WorkspaceRole.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Only workspace owners and administrators can change member roles');
    }

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { id: targetMemberId },
      include: { user: true },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      throw new NotFoundException('Workspace member not found');
    }

    // Protection: Sole Owner cannot be demoted
    if (targetMember.role === WorkspaceRole.WORKSPACE_OWNER && newRole !== WorkspaceRole.WORKSPACE_OWNER) {
      const ownerCount = await this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.WORKSPACE_OWNER,
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot demote the sole workspace owner. Appoint another owner first.');
      }
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: targetMemberId },
      data: { role: newRole },
      include: { user: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async removeMember(
    workspaceId: string,
    targetMemberId: string,
    currentUserId: string,
  ): Promise<{ removed: boolean }> {
    const callerRole = await this.verifyMembership(workspaceId, currentUserId);

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { id: targetMemberId },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      throw new NotFoundException('Workspace member not found');
    }

    const isSelf = targetMember.userId === currentUserId;

    if (!isSelf && callerRole !== WorkspaceRole.WORKSPACE_OWNER && callerRole !== WorkspaceRole.WORKSPACE_ADMIN) {
      throw new ForbiddenException('Only workspace owners and admins can remove other members');
    }

    // Sole owner protection
    if (targetMember.role === WorkspaceRole.WORKSPACE_OWNER) {
      const ownerCount = await this.prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: WorkspaceRole.WORKSPACE_OWNER,
          isActive: true,
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the sole workspace owner');
      }
    }

    await this.prisma.workspaceMember.delete({
      where: { id: targetMemberId },
    });

    return { removed: true };
  }
}
