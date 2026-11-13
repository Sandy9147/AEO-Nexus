import { Job } from 'bullmq';

export interface PlanGenerationJobData {
  planId: string;
  workspaceId: string;
  userId: string;
  retries?: number;
}

export async function processPlanGenerationJob(
  job: Job<PlanGenerationJobData>,
): Promise<{ status: string; planId: string; completedAt: string }> {
  console.log(`[Plan Worker] Processing Strategic Plan Generation Job: ${job.id} for planId: ${job.data.planId}`);

  if (job.attemptsMade > 0) {
    console.log(`[Plan Worker] Job ${job.id} is on retry attempt #${job.attemptsMade}`);
  }

  const startTime = Date.now();

  try {
    // Artificial execution step / external worker step simulation
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`[Plan Worker] Successfully processed plan generation job ${job.id} in ${Date.now() - startTime}ms`);
    return {
      status: 'COMPLETED',
      planId: job.data.planId,
      completedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[Plan Worker] Error executing Plan Generation Job ${job.id}:`, err);
    throw err;
  }
}
