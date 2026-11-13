import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser, verifyJwtHmacSha256, JwtTokenPayload } from '@aeo-nexus/auth';
import { PlatformRole } from '@aeo-nexus/permissions';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new UnauthorizedException(
        'Server authentication configuration error: JWT_SECRET must be at least 32 characters.',
      );
    }
    return secret;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Bearer token missing');
    }

    try {
      const secret = this.getJwtSecret();
      const payload = verifyJwtHmacSha256<JwtTokenPayload>(token, secret);

      request.user = {
        id: payload.sub,
        email: payload.email,
        platformRole: (payload.platformRole as PlatformRole) || null,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid authentication token',
      );
    }
  }
}
