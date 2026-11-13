import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { AiProviderRegistry } from '../providers/provider.registry';
import { AiUsageService } from '../usage/usage.service';
import { WorkspaceContextService } from '../context/workspace-context.service';
import { KnowledgeRetrievalService } from '../retrieval/knowledge-retrieval.service';
import { AiToolRegistryService } from '../tools/tool-registry.service';
import { PromptSanitizer } from '../prompts/prompt-sanitizer';
import { AEO_NEXUS_AGENT_SYSTEM_PROMPT } from '../prompts/system-prompts';
import {
  AiMessageDto,
  AiRunDto,
  AiRunDetailDto,
  SendAiMessageRequest,
} from '@aeo-nexus/contracts';
import {
  AiCompletionRequest,
  ChatMessage,
  ToolCallExecution,
  ToolCallCitation,
} from '../providers/ai-provider.interface';
import { AiRunStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageService: AiUsageService,
    private readonly contextService: WorkspaceContextService,
    private readonly retrievalService: KnowledgeRetrievalService,
    private readonly toolRegistry: AiToolRegistryService,
  ) {}

  async sendMessage(
    workspaceId: string,
    conversationId: string,
    userId: string,
    dto: SendAiMessageRequest,
  ): Promise<{ message: AiMessageDto; assistantMessage: AiMessageDto; runId: string }> {
    // 1. Verify workspace membership
    const userRole = await this.workspacesService.verifyMembership(workspaceId, userId);

    // 2. Budget and limit check
    await this.usageService.checkBudgetOrThrow(workspaceId);

    // 3. Verify conversation
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!conversation || conversation.workspaceId !== workspaceId) {
      throw new NotFoundException('Conversation not found in this workspace');
    }

    // 4. Sanitize user input
    const { cleanText, isFlagged, reason } = PromptSanitizer.sanitizeUserInput(dto.content);
    if (!cleanText) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // 5. Store user message
    const userMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: cleanText,
      },
    });

    // Auto-update conversation title if it's currently 'New Conversation'
    if (conversation.title === 'New Conversation') {
      const generatedTitle = cleanText.substring(0, 40).replace(/[\r\n]+/g, ' ').trim() + (cleanText.length > 40 ? '...' : '');
      await this.prisma.aIConversation.update({
        where: { id: conversationId },
        data: { title: generatedTitle },
      });
    }

    // 6. Gather bounded context & knowledge citations
    const boundedContext = await this.contextService.buildBoundedContext(workspaceId, userId);
    const { documents: retrievedDocs, citations } = await this.retrievalService.retrieveRelevantDocuments(
      workspaceId,
      cleanText,
      3,
    );

    // Format safe system prompt
    const knowledgeBlock = PromptSanitizer.formatSecureKnowledgeContext(retrievedDocs);
    const workspaceConfig = await this.prisma.aIWorkspaceConfig.findUnique({
      where: { workspaceId },
    });

    const fullSystemPrompt = [
      AEO_NEXUS_AGENT_SYSTEM_PROMPT,
      workspaceConfig?.customSystemInstructions ? `\nWorkspace Custom Directives:\n${workspaceConfig.customSystemInstructions}` : '',
      boundedContext.combinedContextPrompt,
      knowledgeBlock,
    ].filter(Boolean).join('\n\n');

    // 7. Initialize AIRun
    const model = dto.model || conversation.model || workspaceConfig?.defaultModel || 'mock-agent-fast';
    const providerType = conversation.provider || workspaceConfig?.defaultProvider || 'mock';

    const run = await this.prisma.aIRun.create({
      data: {
        workspaceId,
        conversationId,
        userId,
        prompt: cleanText,
        status: 'RUNNING',
        provider: providerType,
        model,
        steps: [
          {
            stepNumber: 1,
            type: 'INPUT_PROCESSING',
            description: isFlagged ? `Input flagged (${reason}) - sanitization applied` : 'Input sanitized and validated',
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
          },
          {
            stepNumber: 2,
            type: 'CONTEXT_GATHERING',
            description: `Retrieved ${retrievedDocs.length} relevant knowledge docs and active workspace snapshot`,
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });

    // 8. Prepare completion messages history (last 10 in chronological order)
    const historyMessages: ChatMessage[] = conversation.messages.reverse().map((m) => ({
      role: m.role as any,
      content: m.content,
    }));
    historyMessages.push({ role: 'user', content: cleanText });

    // 9. Execute with Provider
    const adapter = this.providerRegistry.getAdapter(providerType);
    const toolDefinitions = this.toolRegistry.listTools().map((t) => ({
      name: t.id,
      description: t.description,
      parameters: t.parameters as any,
    }));

    const completionRequest: AiCompletionRequest = {
      workspaceId,
      model,
      messages: historyMessages,
      systemPrompt: fullSystemPrompt,
      tools: toolDefinitions,
    };

    let response;
    try {
      response = await adapter.generateCompletion(completionRequest);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Provider error for run ${run.id}: ${errMsg}`);

      await this.prisma.aIRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          error: errMsg,
          completedAt: new Date(),
        },
      });

      // Still provide a safe explanatory assistant message
      const errorMsg = await this.prisma.aIMessage.create({
        data: {
          conversationId,
          role: 'assistant',
          content: `⚠️ I encountered an issue communicating with the AI service: ${errMsg}. Please check your model configuration or retry in a moment.`,
        },
      });

      return {
        message: {
          id: userMessage.id,
          conversationId: userMessage.conversationId,
          role: 'user',
          content: userMessage.content,
          createdAt: userMessage.createdAt.toISOString(),
        },
        assistantMessage: {
          id: errorMsg.id,
          conversationId: errorMsg.conversationId,
          role: 'assistant',
          content: errorMsg.content,
          createdAt: errorMsg.createdAt.toISOString(),
        },
        runId: run.id,
      };
    }

    // 10. Process Tool Calls if proposed
    const executedToolCalls: ToolCallExecution[] = [];
    let requiresApproval = false;
    let finalAssistantText = response.content;

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const call of response.toolCalls) {
        const executionResult = await this.toolRegistry.executeTool(call.toolName, call.args, {
          workspaceId,
          userId,
          userRole,
          runId: run.id,
          conversationId,
        });

        executedToolCalls.push({
          id: call.id,
          toolName: call.toolName,
          args: call.args,
          result: executionResult.data,
          status: executionResult.requiresApproval ? 'REQUIRES_APPROVAL' : executionResult.success ? 'SUCCESS' : 'FAILED',
          error: executionResult.error,
        });

        if (executionResult.requiresApproval) {
          requiresApproval = true;
        }

        // Append execution summary to assistant output if informative
        if (executionResult.summary) {
          finalAssistantText += `\n\n> 🛠️ **Tool Execution (${call.toolName})**: ${executionResult.summary}`;
        }
      }
    }

    // 11. Record Token Usage
    const promptTokens = response.usage.promptTokens;
    const completionTokens = response.usage.completionTokens;
    const totalTokens = response.usage.totalTokens;
    const cost = this.usageService.calculateCost(model, promptTokens, completionTokens);

    await this.usageService.recordUsage({
      workspaceId,
      userId,
      provider: response.provider,
      model: response.model,
      requestId: run.id,
      promptTokens,
      completionTokens,
    });

    // 12. Update AIRun status
    const currentSteps = Array.isArray(run.steps) ? (run.steps as any[]) : [];
    currentSteps.push({
      stepNumber: 3,
      type: 'MODEL_GENERATION',
      description: `Generated ${completionTokens} completion tokens using ${response.provider} / ${response.model}`,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
    });

    if (executedToolCalls.length > 0) {
      currentSteps.push({
        stepNumber: 4,
        type: 'TOOL_EXECUTION',
        description: `Executed ${executedToolCalls.length} tools (${executedToolCalls.map((t) => t.toolName).join(', ')})`,
        output: executedToolCalls,
        status: requiresApproval ? 'REQUIRES_APPROVAL' : 'COMPLETED',
        timestamp: new Date().toISOString(),
      });
    }

    await this.prisma.aIRun.update({
      where: { id: run.id },
      data: {
        status: requiresApproval ? 'REQUIRES_APPROVAL' : 'COMPLETED',
        stepCount: currentSteps.length,
        steps: currentSteps,
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd: new Decimal(cost) as any,
        completedAt: new Date(),
      },
    });

    // 13. Store Assistant Message
    const assistantMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: finalAssistantText,
        citations: citations.length > 0 ? (citations as any) : undefined,
        toolCalls: executedToolCalls.length > 0 ? (executedToolCalls as any) : undefined,
        tokensUsed: totalTokens,
      },
    });

    return {
      message: {
        id: userMessage.id,
        conversationId: userMessage.conversationId,
        role: 'user',
        content: userMessage.content,
        createdAt: userMessage.createdAt.toISOString(),
      },
      assistantMessage: {
        id: assistantMessage.id,
        conversationId: assistantMessage.conversationId,
        role: 'assistant',
        content: assistantMessage.content,
        citations: citations.length > 0 ? (citations as any) : undefined,
        toolCalls: executedToolCalls.length > 0 ? (executedToolCalls as any) : undefined,
        tokensUsed: assistantMessage.tokensUsed,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      runId: run.id,
    };
  }

  async listRuns(workspaceId: string, userId: string, conversationId?: string): Promise<AiRunDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const where: any = { workspaceId };
    if (conversationId) {
      where.conversationId = conversationId;
    }

    const runs = await this.prisma.aIRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return runs.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      conversationId: r.conversationId,
      userId: r.userId,
      prompt: r.prompt,
      status: r.status as any,
      provider: r.provider,
      model: r.model,
      stepCount: r.stepCount,
      error: r.error,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      costUsd: Number(r.costUsd),
      completedAt: r.completedAt?.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async getRunDetails(workspaceId: string, runId: string, userId: string): Promise<AiRunDetailDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const run = await this.prisma.aIRun.findUnique({
      where: { id: runId },
      include: {
        approvals: {
          include: {
            requestedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            reviewedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!run || run.workspaceId !== workspaceId) {
      throw new NotFoundException('AI Run not found in this workspace');
    }

    return {
      id: run.id,
      workspaceId: run.workspaceId,
      conversationId: run.conversationId,
      userId: run.userId,
      prompt: run.prompt,
      status: run.status as any,
      provider: run.provider,
      model: run.model,
      stepCount: run.stepCount,
      steps: run.steps as any,
      error: run.error,
      promptTokens: run.promptTokens,
      completionTokens: run.completionTokens,
      totalTokens: run.totalTokens,
      costUsd: Number(run.costUsd),
      completedAt: run.completedAt?.toISOString(),
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      approvals: run.approvals.map((a) => ({
        id: a.id,
        workspaceId: a.workspaceId,
        runId: a.runId,
        conversationId: a.conversationId,
        actionType: a.actionType as any,
        title: a.title,
        description: a.description,
        payload: a.payload as Record<string, unknown>,
        status: a.status as any,
        requestedById: a.requestedById,
        requestedBy: a.requestedBy,
        reviewedById: a.reviewedById,
        reviewedBy: a.reviewedBy,
        reviewedAt: a.reviewedAt?.toISOString(),
        reviewNotes: a.reviewNotes,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}
