import { Job } from 'bullmq';

export interface WebsiteGenerationJobData {
  websiteId: string;
  workspaceId: string;
  userId: string;
  additionalInstructions?: string;
  retries?: number;
}

export async function processWebsiteGenerationJob(
  job: Job<WebsiteGenerationJobData>,
): Promise<{ status: string; websiteId: string; completedAt: string }> {
  if (!job.data.workspaceId || typeof job.data.workspaceId !== 'string' || job.data.workspaceId.trim().length === 0) {
    throw new Error('Tenant boundary violation: job missing valid workspaceId');
  }

  console.log(`[Website Worker] Processing Website Generation Job: ${job.id} for websiteId: ${job.data.websiteId} (workspace: ${job.data.workspaceId})`);

  if (job.attemptsMade > 0) {
    console.log(`[Website Worker] Job ${job.id} is on retry attempt #${job.attemptsMade}`);
  }

  const startTime = Date.now();

  try {
    // Process external worker execution step simulation
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`[Website Worker] Successfully processed website generation job ${job.id} in ${Date.now() - startTime}ms`);
    return {
      status: 'COMPLETED',
      websiteId: job.data.websiteId,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Website Worker] Error executing Website Generation Job ${job.id}:`, err);
    throw err;
  }
}

