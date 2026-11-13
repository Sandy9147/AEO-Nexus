import { processWorkflowJob } from '../src/processors/health.processor';
import { WorkflowStatus } from '@aeo-nexus/workflow-engine';
import { Job } from 'bullmq';

async function testWorker() {
  console.log('Testing BullMQ Workflow Processor...');

  const mockJob = {
    id: 'job_test_001',
    data: {
      workflowId: 'wf_test_123',
      executionId: 'exec_test_456',
      stepId: 'step_1',
      action: 'health.check',
      inputData: { ping: 'pong' },
    },
  } as unknown as Job<any, any>;

  const result = await processWorkflowJob(mockJob);

  if (result.status !== WorkflowStatus.COMPLETED) {
    throw new Error(`Expected COMPLETED but got ${result.status}`);
  }
  if (result.executionId !== 'exec_test_456') {
    throw new Error(`ExecutionId mismatch: ${result.executionId}`);
  }
  if (result.stepId !== 'step_1') {
    throw new Error(`StepId mismatch: ${result.stepId}`);
  }

  console.log('✓ Worker processor test PASSED successfully');
  console.log('  Result:', JSON.stringify(result, null, 2));
}

testWorker().catch((err) => {
  console.error('✗ Worker processor test FAILED:', err);
  process.exit(1);
});

