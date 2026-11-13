import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { DiscoverOrchestratorService } from './discover-orchestrator.service';

export interface DiscoverResearchJobData {
  researchId: string;
  workspaceId: string;
  userId: string;
}

@Injectable()
export class DiscoverQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscoverQueueService.name);
  private queue: Queue | null = null;
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  constructor(private readonly orchestrator: DiscoverOrchestratorService) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis connection error in DiscoverQueueService: ${err.message}`);
        this.isRedisAvailable = false;
      });

      await this.redisClient.connect();
      this.queue = new Queue('aeo-nexus-research', {
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
      this.logger.log('DiscoverQueueService successfully connected to Redis queue "aeo-nexus-research"');
    } catch (err) {
      this.logger.warn(
        `Redis unavailable for DiscoverQueueService (${err instanceof Error ? err.message : String(err)}). Falling back to direct asynchronous background processing.`,
      );
      this.isRedisAvailable = false;
    }
  }

  async enqueueResearch(jobData: DiscoverResearchJobData): Promise<void> {
    if (this.isRedisAvailable && this.queue) {
      try {
        await this.queue.add(
          `research_${jobData.researchId}`,
          jobData,
          {
            jobId: `job_${jobData.researchId}`,
          },
        );
        this.logger.log(`Research job ${jobData.researchId} enqueued to BullMQ`);
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
        await this.orchestrator.executeResearch(jobData.researchId, jobData.workspaceId, jobData.userId);
      } catch (e) {
        this.logger.error(`Direct execution of research ${jobData.researchId} failed:`, e instanceof Error ? e.message : String(e));
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

