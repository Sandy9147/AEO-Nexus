import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processWorkflowJob } from './processors/health.processor';
import { processAiRunJob } from './processors/ai-run.processor';

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

  console.log(
    '⚡ AEO Nexus Worker is running and listening for jobs on queues "aeo-nexus-workflows" and "aeo-nexus-ai-runs"',
  );

  const shutdown = async () => {
    console.log('[Worker] Shutting down gracefully...');
    await workflowWorker.close();
    await aiWorker.close();
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
