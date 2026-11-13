import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PlanOrchestratorService } from './plan-orchestrator.service';

export interface PlanGenerationJobData {
  planId: string;
  workspaceId: string;
  userId: string;
}

@Injectable()
export class PlanQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlanQueueService.name);
  private queue: Queue | null = null;
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  constructor(private readonly orchestrator: PlanOrchestratorService) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis connection error in PlanQueueService: ${err.message}`);
        this.isRedisAvailable = false;
      });

      await this.redisClient.connect();
      this.queue = new Queue('aeo-nexus-plans', {
        connection: this.redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });
      this.isRedisAvailable = true;
      this.logger.log('PlanQueueService successfully connected to Redis queue "aeo-nexus-plans"');
    } catch (err) {
      this.logger.warn(
        `Redis unavailable for PlanQueueService (${err instanceof Error ? err.message : String(err)}). Falling back to direct asynchronous background processing.`,
      );
      this.isRedisAvailable = false;
    }
  }

  async enqueuePlanGeneration(jobData: PlanGenerationJobData): Promise<void> {
    if (this.isRedisAvailable && this.queue) {
      try {
        await this.queue.add(
          `plan_${jobData.planId}`,
          jobData,
          {
            jobId: `job_${jobData.planId}`,
          },
        );
        this.logger.log(`Plan generation job ${jobData.planId} enqueued to BullMQ`);
        return;
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue to BullMQ (${err instanceof Error ? err.message : String(err)}). Executing asynchronously in background.`,
        );
      }
    }

    // Direct asynchronous execution fallback
    setImmediate(async () => {
      try {
        await this.orchestrator.executePlanGeneration(jobData.planId, jobData.workspaceId, jobData.userId);
      } catch (e) {
        this.logger.error(`Direct execution of plan ${jobData.planId} failed:`, e instanceof Error ? e.message : String(e));
      }
    });
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
