import { WorkspaceRole, AiActionType } from '@prisma/client';

export interface ToolExecutionContext {
  workspaceId: string;
  userId: string;
  userRole: WorkspaceRole;
  runId?: string;
  conversationId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresApproval?: boolean;
  approvalId?: string;
  summary: string;
}

export interface IAiTool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiresApproval: boolean;
  readonly actionType?: AiActionType;
  readonly requiredRole?: WorkspaceRole;
  readonly parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };

  execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

