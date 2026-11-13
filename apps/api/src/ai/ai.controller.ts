import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard, RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { AiProviderRegistry } from './providers/provider.registry';
import { AiUsageService } from './usage/usage.service';
import { AiTemplatesService } from './prompts/templates.service';
import { AiToolRegistryService } from './tools/tool-registry.service';
import { AiApprovalsService } from './approvals/approvals.service';
import { AiConversationsService } from './conversations/conversations.service';
import { AgentOrchestratorService } from './orchestration/agent-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateAiConversationRequest,
  UpdateAiConversationRequest,
  SendAiMessageRequest,
  ReviewAiApprovalRequest,
  UpdateAiWorkspaceConfigRequest,
} from '@aeo-nexus/contracts';
import { Decimal } from '@prisma/client/runtime/library';

@Controller('workspaces/:workspaceId/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly providerRegistry: AiProviderRegistry,
    private readonly usageService: AiUsageService,
    private readonly templatesService: AiTemplatesService,
    private readonly toolRegistry: AiToolRegistryService,
    private readonly approvalsService: AiApprovalsService,
    private readonly conversationsService: AiConversationsService,
    private readonly orchestratorService: AgentOrchestratorService,
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  // ---------------------------------------------------------------------------
  // Provider Status & Available Models
  // ---------------------------------------------------------------------------

  @Get('providers')
  async getProviders(@Req() req: RequestWithUser, @Param('workspaceId') workspaceId: string) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const providers = this.providerRegistry.getProviderStatus();
    return {
      success: true,
      data: providers,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Workspace AI Configuration & Limits
  // ---------------------------------------------------------------------------

  @Get('config')
  async getConfig(@Req() req: RequestWithUser, @Param('workspaceId') workspaceId: string) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);

    let config = await this.prisma.aIWorkspaceConfig.findUnique({
      where: { workspaceId },
    });

    if (!config) {
      config = await this.prisma.aIWorkspaceConfig.create({
        data: {
          workspaceId,
          defaultProvider: 'mock',
          defaultModel: 'mock-agent-fast',
          monthlyTokenBudget: 1000000,
          monthlyCostBudget: new Decimal(50.0),
          requireApprovalForSensitive: true,
        },
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const usage = await this.prisma.aIUsageRecord.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
        status: 'SUCCESS',
      },
      _sum: {
        totalTokens: true,
        estimatedCost: true,
      },
    });

    return {
      success: true,
      data: {
        id: config.id,
        workspaceId: config.workspaceId,
        defaultProvider: config.defaultProvider,
        defaultModel: config.defaultModel,
        monthlyTokenBudget: config.monthlyTokenBudget,
        monthlyCostBudget: Number(config.monthlyCostBudget),
        requireApprovalForSensitive: config.requireApprovalForSensitive,
        customSystemInstructions: config.customSystemInstructions,
        tokensUsedThisMonth: usage._sum.totalTokens || 0,
        costUsedThisMonth: Number(usage._sum.estimatedCost || 0),
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Patch('config')
  async updateConfig(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateAiWorkspaceConfigRequest,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);

    const updated = await this.prisma.aIWorkspaceConfig.upsert({
      where: { workspaceId },
      update: {
        ...(dto.defaultProvider !== undefined ? { defaultProvider: dto.defaultProvider } : {}),
        ...(dto.defaultModel !== undefined ? { defaultModel: dto.defaultModel } : {}),
        ...(dto.monthlyTokenBudget !== undefined ? { monthlyTokenBudget: dto.monthlyTokenBudget } : {}),
        ...(dto.monthlyCostBudget !== undefined ? { monthlyCostBudget: new Decimal(dto.monthlyCostBudget) } : {}),
        ...(dto.requireApprovalForSensitive !== undefined ? { requireApprovalForSensitive: dto.requireApprovalForSensitive } : {}),
        ...(dto.customSystemInstructions !== undefined ? { customSystemInstructions: dto.customSystemInstructions } : {}),
      },
      create: {
        workspaceId,
        defaultProvider: dto.defaultProvider || 'mock',
        defaultModel: dto.defaultModel || 'mock-agent-fast',
        monthlyTokenBudget: dto.monthlyTokenBudget || 1000000,
        monthlyCostBudget: new Decimal(dto.monthlyCostBudget || 50.0),
        requireApprovalForSensitive: dto.requireApprovalForSensitive ?? true,
        customSystemInstructions: dto.customSystemInstructions,
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        workspaceId: updated.workspaceId,
        defaultProvider: updated.defaultProvider,
        defaultModel: updated.defaultModel,
        monthlyTokenBudget: updated.monthlyTokenBudget,
        monthlyCostBudget: Number(updated.monthlyCostBudget),
        requireApprovalForSensitive: updated.requireApprovalForSensitive,
        customSystemInstructions: updated.customSystemInstructions,
        tokensUsedThisMonth: 0,
        costUsedThisMonth: 0,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Conversations
  // ---------------------------------------------------------------------------

  @Get('conversations')
  async listConversations(@Req() req: RequestWithUser, @Param('workspaceId') workspaceId: string) {
    const data = await this.conversationsService.listConversations(workspaceId, req.user.id);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('conversations')
  async createConversation(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateAiConversationRequest,
  ) {
    const data = await this.conversationsService.createConversation(workspaceId, req.user.id, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('conversations/:conversationId')
  async getConversation(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const data = await this.conversationsService.getConversation(workspaceId, conversationId, req.user.id);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('conversations/:conversationId')
  async updateConversation(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateAiConversationRequest,
  ) {
    const data = await this.conversationsService.updateConversation(workspaceId, conversationId, req.user.id, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const data = await this.conversationsService.deleteConversation(workspaceId, conversationId, req.user.id);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Messages & Orchestration
  // ---------------------------------------------------------------------------

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendAiMessageRequest,
  ) {
    const data = await this.orchestratorService.sendMessage(workspaceId, conversationId, req.user.id, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Execution Runs
  // ---------------------------------------------------------------------------

  @Get('runs')
  async listRuns(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('conversationId') conversationId?: string,
  ) {
    const data = await this.orchestratorService.listRuns(workspaceId, req.user.id, conversationId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('runs/:runId')
  async getRunDetails(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
  ) {
    const data = await this.orchestratorService.getRunDetails(workspaceId, runId, req.user.id);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Human Approvals
  // ---------------------------------------------------------------------------

  @Get('approvals')
  async listApprovals(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
  ) {
    const data = await this.approvalsService.listApprovals(workspaceId, req.user.id, status);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('approvals/:approvalId/review')
  async reviewApproval(
    @Req() req: RequestWithUser,
    @Param('workspaceId') workspaceId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ReviewAiApprovalRequest,
  ) {
    const data = await this.approvalsService.reviewApproval(workspaceId, approvalId, req.user.id, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Usage & Telemetry
  // ---------------------------------------------------------------------------

  @Get('usage')
  async getUsage(@Req() req: RequestWithUser, @Param('workspaceId') workspaceId: string) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const data = await this.usageService.getUsageSummary(workspaceId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // Tool Registry & Templates
  // ---------------------------------------------------------------------------

  @Get('tools')
  async listTools(@Req() req: RequestWithUser, @Param('workspaceId') workspaceId: string) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const data = this.toolRegistry.listTools();
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('templates')
  async listTemplates(@Req() req: RequestWithUser, @Param('workspaceId') workspaceId: string) {
    await this.workspacesService.verifyMembership(workspaceId, req.user.id);
    const data = await this.templatesService.listTemplates(workspaceId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
