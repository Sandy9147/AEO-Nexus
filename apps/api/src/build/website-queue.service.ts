import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { WebsiteOrchestratorService } from './website-orchestrator.service';

export interface WebsiteGenerationJobData {
  websiteId: string;
  workspaceId: string;
  userId: string;
  additionalInstructions?: string;
}

@Injectable()
export class WebsiteQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebsiteQueueService.name);
  private queue: Queue | null = null;
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  constructor(private readonly orchestrator: WebsiteOrchestratorService) {}

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      this.redisClient.on('error', (err) => {
        this.logger.warn(`Redis connection error in WebsiteQueueService: ${err.message}`);
        this.isRedisAvailable = false;
      });

      await this.redisClient.connect();
      this.queue = new Queue('aeo-nexus-websites', {
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
      this.logger.log('WebsiteQueueService successfully connected to Redis queue "aeo-nexus-websites"');
    } catch (err) {
      this.logger.warn(
        `Redis unavailable for WebsiteQueueService (${err instanceof Error ? err.message : String(err)}). Falling back to direct asynchronous background processing.`,
      );
      this.isRedisAvailable = false;
    }
  }

  async enqueueWebsiteGeneration(jobData: WebsiteGenerationJobData): Promise<void> {
    if (this.isRedisAvailable && this.queue) {
      try {
        await this.queue.add(
          `website_${jobData.websiteId}`,
          jobData,
          {
            jobId: `job_${jobData.websiteId}_${Date.now()}`,
          },
        );
        this.logger.log(`Website generation job ${jobData.websiteId} enqueued to BullMQ`);
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
        await this.orchestrator.executeWebsiteGeneration(
          jobData.websiteId,
          jobData.workspaceId,
          jobData.userId,
          jobData.additionalInstructions,
        );
      } catch (err) {
        this.logger.error(
          `Asynchronous website generation failed for ${jobData.websiteId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }
}

