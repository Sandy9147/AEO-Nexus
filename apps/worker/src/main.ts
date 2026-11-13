import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processWorkflowJob } from './processors/health.processor';

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

  const worker = new Worker('aeo-nexus-workflows', processWorkflowJob, {
    connection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  console.log(
    '⚡ AEO Nexus Worker is running and listening for jobs on queue "aeo-nexus-workflows"',
  );

  const shutdown = async () => {
    console.log('[Worker] Shutting down gracefully...');
    await worker.close();
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
