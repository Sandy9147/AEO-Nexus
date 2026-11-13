import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithUser } from './jwt-auth.guard';
import { WorkspaceRole } from '@aeo-nexus/permissions';

export interface RequestWithWorkspace extends RequestWithUser {
  workspaceContext: {
    workspaceId: string;
    role: WorkspaceRole;
    isOwner: boolean;
  };
}

@Injectable()
export class WorkspaceMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithWorkspace>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Retrieve workspace ID from header, query or params
    const workspaceId =
      (request.headers['x-workspace-id'] as string) ||
      (request.params['workspaceId'] as string) ||
      (request.query['workspaceId'] as string);

    if (!workspaceId) {
      throw new BadRequestException(
        'Workspace ID is required (header x-workspace-id or path param)',
      );
    }

    // Server-side database verification of workspace membership
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: true,
      },
    });

    if (!membership || !membership.isActive || !membership.workspace.isActive) {
      throw new ForbiddenException('Access denied: You are not an active member of this workspace');
    }

    // Attach validated server-side workspace context
    request.workspaceContext = {
      workspaceId: membership.workspaceId,
      role: membership.role as WorkspaceRole,
      isOwner: membership.role === WorkspaceRole.WORKSPACE_OWNER,
    };

    return true;
  }
}
