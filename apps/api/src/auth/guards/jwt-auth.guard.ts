import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '@aeo-nexus/auth';
import { PlatformRole } from '@aeo-nexus/permissions';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    // In production/Phase 2 this verifies against JWT_SECRET using crypto/jose/jwt
    // For Phase 1 foundation, decode or mock-validate structured payload
    try {
      // Basic payload decoding for development baseline
      const parts = token.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        request.user = {
          id: decoded.sub,
          email: decoded.email,
          platformRole: decoded.platformRole as PlatformRole,
        };
      } else {
        // Fallback for dev testing tokens: "dev-user-id" or similar
        request.user = {
          id: token.startsWith('user_') ? token : 'usr_dev_foundation',
          email: 'dev@aeonexus.internal',
          platformRole: token.includes('superadmin') ? PlatformRole.SUPERADMIN : null,
        };
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
