import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckResponse, ServiceStatus } from '@aeo-nexus/contracts';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis | null = null;
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });
      // Handle error events so unhandled exceptions do not crash process
      this.redisClient.on('error', (err) => {
        this.logger.debug(`Redis ping check warning: ${err.message}`);
      });
    } catch {
      this.logger.warn('Redis client initialization deferred');
    }
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    let dbStatus: ServiceStatus = 'down';
    let redisStatus: ServiceStatus = 'down';

    // 1. PostgreSQL check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    // 2. Redis check
    if (this.redisClient) {
      try {
        if (this.redisClient.status !== 'ready' && this.redisClient.status !== 'connecting') {
          await this.redisClient.connect();
        }
        const pong = await this.redisClient.ping();
        if (pong === 'PONG') {
          redisStatus = 'up';
        }
      } catch {
        redisStatus = 'down';
      }
    }

    const isHealthy = dbStatus === 'up' && redisStatus === 'up';
    const isDegraded =
      (dbStatus === 'up' && redisStatus !== 'up') || (dbStatus !== 'up' && redisStatus === 'up');

    return {
      status: isHealthy ? 'ok' : isDegraded ? 'degraded' : 'down',
      service: 'aeo-nexus-api',
      version: '0.1.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }

  async isLivenessOk(): Promise<{ status: 'ok'; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
