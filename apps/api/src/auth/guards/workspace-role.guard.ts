import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithWorkspace } from './workspace.guard';
import { WorkspaceRole } from '@aeo-nexus/permissions';

export const REQUIRED_WORKSPACE_ROLES_KEY = 'required_workspace_roles';
export const RequireWorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata(REQUIRED_WORKSPACE_ROLES_KEY, roles);

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(
      REQUIRED_WORKSPACE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithWorkspace>();
    const workspaceContext = request.workspaceContext;

    if (!workspaceContext) {
      throw new ForbiddenException(
        'Workspace membership context missing. Ensure WorkspaceMembershipGuard runs first.',
      );
    }

    if (!requiredRoles.includes(workspaceContext.role)) {
      throw new ForbiddenException(
        `Access denied: Workspace role '${workspaceContext.role}' is not authorized for this operation. Required: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}

