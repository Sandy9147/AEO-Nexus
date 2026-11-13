export enum WorkflowStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum WorkflowStepType {
  ACTION = 'ACTION',
  AI_PROMPT = 'AI_PROMPT',
  CONDITIONAL = 'CONDITIONAL',
  NOTIFICATION = 'NOTIFICATION',
  INTEGRATION = 'INTEGRATION',
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  nextStepId?: string;
}

export interface WorkflowDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  version: number;
  steps: WorkflowStep[];
  entryStepId: string;
}

export interface WorkflowJobPayload {
  executionId: string;
  workflowId: string;
  workspaceId: string;
  initiatedByUserId: string;
  stepId: string;
  inputData: Record<string, unknown>;
}

export interface WorkflowJobResult {
  executionId: string;
  stepId: string;
  status: WorkflowStatus;
  outputData?: Record<string, unknown>;
  error?: string;
}
