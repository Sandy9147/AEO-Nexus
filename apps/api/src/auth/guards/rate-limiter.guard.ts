import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'RATE_LIMIT_CONFIG';

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

export const RateLimit = (limit = 10, windowSeconds = 60) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowSeconds });

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private static readonly memoryStore = new Map<string, RateLimitRecord>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || { limit: 15, windowSeconds: 60 };

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.socket.remoteAddress ||
      '127.0.0.1';
    const email = request.body?.email ? String(request.body.email).toLowerCase() : '';
    const key = `${request.path}:${clientIp}:${email}`;

    const now = Date.now();
    const record = RateLimiterGuard.memoryStore.get(key);

    if (!record || record.resetAt <= now) {
      RateLimiterGuard.memoryStore.set(key, {
        count: 1,
        resetAt: now + options.windowSeconds * 1000,
      });
      return true;
    }

    if (record.count >= options.limit) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Too many attempts. Please try again in ${waitSeconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  static reset(): void {
    RateLimiterGuard.memoryStore.clear();
  }
}

