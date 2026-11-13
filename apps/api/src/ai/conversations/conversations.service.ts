import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import {
  AiConversationDto,
  AiConversationDetailDto,
  CreateAiConversationRequest,
  UpdateAiConversationRequest,
  AiMessageDto,
} from '@aeo-nexus/contracts';

@Injectable()
export class AiConversationsService {
  private readonly logger = new Logger(AiConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async listConversations(workspaceId: string, userId: string): Promise<AiConversationDto[]> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const conversations = await this.prisma.aIConversation.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        _count: { select: { messages: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      workspaceId: c.workspaceId,
      userId: c.userId,
      title: c.title,
      model: c.model,
      provider: c.provider,
      systemPrompt: c.systemPrompt,
      isArchived: c.isArchived,
      messagesCount: c._count.messages,
      lastMessageAt: c.messages[0]?.createdAt.toISOString() || null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getConversation(
    workspaceId: string,
    conversationId: string,
    userId: string,
  ): Promise<AiConversationDetailDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!conversation || conversation.workspaceId !== workspaceId) {
      throw new NotFoundException('Conversation not found in this workspace');
    }

    const messages: AiMessageDto[] = conversation.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role as any,
      content: m.content,
      citations: m.citations as any,
      toolCalls: m.toolCalls as any,
      tokensUsed: m.tokensUsed,
      createdAt: m.createdAt.toISOString(),
    }));

    return {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      userId: conversation.userId,
      title: conversation.title,
      model: conversation.model,
      provider: conversation.provider,
      systemPrompt: conversation.systemPrompt,
      isArchived: conversation.isArchived,
      messagesCount: conversation._count.messages,
      lastMessageAt: messages[messages.length - 1]?.createdAt || null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    };
  }

  async createConversation(
    workspaceId: string,
    userId: string,
    dto: CreateAiConversationRequest,
  ): Promise<AiConversationDetailDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    // Get workspace default AI model/provider if not passed
    const config = await this.prisma.aIWorkspaceConfig.findUnique({
      where: { workspaceId },
    });

    const model = dto.model || config?.defaultModel || 'mock-agent-fast';
    const provider = dto.provider || config?.defaultProvider || 'mock';
    const title = dto.title?.trim() || 'New Conversation';

    const conversation = await this.prisma.aIConversation.create({
      data: {
        workspaceId,
        userId,
        title,
        model,
        provider,
        systemPrompt: dto.systemPrompt,
      },
    });

    const messages: AiMessageDto[] = [];

    // If an initial message was supplied, store it
    if (dto.initialMessage?.trim()) {
      const userMsg = await this.prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: dto.initialMessage.trim(),
        },
      });
      messages.push({
        id: userMsg.id,
        conversationId: userMsg.conversationId,
        role: 'user',
        content: userMsg.content,
        createdAt: userMsg.createdAt.toISOString(),
      });
    }

    return {
      id: conversation.id,
      workspaceId: conversation.workspaceId,
      userId: conversation.userId,
      title: conversation.title,
      model: conversation.model,
      provider: conversation.provider,
      systemPrompt: conversation.systemPrompt,
      isArchived: conversation.isArchived,
      messagesCount: messages.length,
      lastMessageAt: messages[0]?.createdAt || null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    };
  }

  async updateConversation(
    workspaceId: string,
    conversationId: string,
    userId: string,
    dto: UpdateAiConversationRequest,
  ): Promise<AiConversationDto> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.workspaceId !== workspaceId) {
      throw new NotFoundException('Conversation not found in this workspace');
    }

    const updated = await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.provider !== undefined ? { provider: dto.provider } : {}),
        ...(dto.systemPrompt !== undefined ? { systemPrompt: dto.systemPrompt } : {}),
        ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived } : {}),
      },
      include: {
        _count: { select: { messages: true } },
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      title: updated.title,
      model: updated.model,
      provider: updated.provider,
      systemPrompt: updated.systemPrompt,
      isArchived: updated.isArchived,
      messagesCount: updated._count.messages,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteConversation(
    workspaceId: string,
    conversationId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.workspaceId !== workspaceId) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.aIConversation.delete({
      where: { id: conversationId },
    });

    return { deleted: true };
  }
}

