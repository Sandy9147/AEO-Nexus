import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processWorkflowJob } from './processors/health.processor';
import { processAiRunJob } from './processors/ai-run.processor';
import { processDiscoverResearchJob } from './processors/discover-research.processor';
import { processPlanGenerationJob } from './processors/plan-generation.processor';
import { processWebsiteGenerationJob } from './processors/website-generation.processor';

async function bootstrap() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`[Worker] Initializing AEO Nexus Background Worker against Redis: ${redisUrl}`);

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  connection.on('error', (err) => {
    console.warn(`[Worker Redis Connection Warning] ${err.message}`);
  });

  try {
    await connection.connect();
    console.log('[Worker] Connected to Redis successfully');
  } catch (err) {
    console.warn(
      `[Worker] Redis connection deferred until ready: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const workflowWorker = new Worker('aeo-nexus-workflows', processWorkflowJob, {
    connection,
    concurrency: 5,
  });

  const aiWorker = new Worker('aeo-nexus-ai-runs', processAiRunJob, {
    connection,
    concurrency: 3,
  });

  const discoverWorker = new Worker('aeo-nexus-research', processDiscoverResearchJob, {
    connection,
    concurrency: 3,
  });

  const planWorker = new Worker('aeo-nexus-plans', processPlanGenerationJob, {
    connection,
    concurrency: 3,
  });

  const websiteWorker = new Worker('aeo-nexus-websites', processWebsiteGenerationJob, {
    connection,
    concurrency: 3,
  });

  workflowWorker.on('completed', (job) => {
    console.log(`[Workflow Worker] Job ${job.id} completed successfully`);
  });

  workflowWorker.on('failed', (job, err) => {
    console.error(`[Workflow Worker] Job ${job?.id} failed with error:`, err);
  });

  aiWorker.on('completed', (job) => {
    console.log(`[AI Worker] Job ${job.id} completed successfully`);
  });

  aiWorker.on('failed', (job, err) => {
    console.error(`[AI Worker] Job ${job?.id} failed with error:`, err);
  });

  discoverWorker.on('completed', (job) => {
    console.log(`[Discover Worker] Job ${job.id} completed successfully`);
  });

  discoverWorker.on('failed', (job, err) => {
    console.error(`[Discover Worker] Job ${job?.id} failed with error:`, err);
  });

  planWorker.on('completed', (job) => {
    console.log(`[Plan Worker] Job ${job.id} completed successfully`);
  });

  planWorker.on('failed', (job, err) => {
    console.error(`[Plan Worker] Job ${job?.id} failed with error:`, err);
  });

  websiteWorker.on('completed', (job) => {
    console.log(`[Website Worker] Job ${job.id} completed successfully`);
  });

  websiteWorker.on('failed', (job, err) => {
    console.error(`[Website Worker] Job ${job?.id} failed with error:`, err);
  });

  console.log(
    '⚡ AEO Nexus Worker is running and listening for jobs on queues "aeo-nexus-workflows", "aeo-nexus-ai-runs", "aeo-nexus-research", "aeo-nexus-plans", and "aeo-nexus-websites"',
  );

  const shutdown = async () => {
    console.log('[Worker] Shutting down gracefully...');
    await workflowWorker.close();
    await aiWorker.close();
    await discoverWorker.close();
    await planWorker.close();
    await websiteWorker.close();
    await connection.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});
