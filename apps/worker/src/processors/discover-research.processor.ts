import { Job } from 'bullmq';

export interface DiscoverResearchJobData {
  researchId: string;
  workspaceId: string;
  userId: string;
  retries?: number;
}

export async function processDiscoverResearchJob(
  job: Job<DiscoverResearchJobData>,
): Promise<{ status: string; researchId: string; completedAt: string }> {
  if (!job.data.workspaceId || typeof job.data.workspaceId !== 'string' || job.data.workspaceId.trim().length === 0) {
    throw new Error('Tenant boundary violation: job missing valid workspaceId');
  }

  console.log(`[Discover Worker] Processing Discover Research Job: ${job.id} for researchId: ${job.data.researchId} (workspace: ${job.data.workspaceId})`);

  if (job.attemptsMade > 0) {
    console.log(`[Discover Worker] Job ${job.id} is on retry attempt #${job.attemptsMade}`);
  }

  const startTime = Date.now();

  try {
    // Artificial execution step / external worker step simulation
    await new Promise((resolve) => setTimeout(resolve, 600));

    console.log(`[Discover Worker] Successfully processed research job ${job.id} in ${Date.now() - startTime}ms`);
    return {
      status: 'COMPLETED',
      researchId: job.data.researchId,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Discover Worker] Error executing Discover Research Job ${job.id}:`, err);
    throw err;
  }
}

