import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from './jwt-auth.guard';
import { PlatformRole } from '@aeo-nexus/permissions';

export const REQUIRED_PLATFORM_ROLES_KEY = 'required_platform_roles';
export const RequirePlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(REQUIRED_PLATFORM_ROLES_KEY, roles);

@Injectable()
export class PlatformRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      REQUIRED_PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.platformRole) {
      throw new ForbiddenException(
        'Access denied: Platform administrative privileges required. Workspace roles cannot be used on platform endpoints.',
      );
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.platformRole);
      if (!hasRole) {
        throw new ForbiddenException(
          `Access denied: Required platform role (${requiredRoles.join(', ')}) not held by user.`,
        );
      }
    }

    return true;
  }
}

