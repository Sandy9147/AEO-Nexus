import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MockAiProvider } from './providers/mock.provider';
import { GeminiAiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicAiProvider } from './providers/anthropic.provider';
import { AiProviderRegistry } from './providers/provider.registry';
import { AiUsageService } from './usage/usage.service';
import { AiTemplatesService } from './prompts/templates.service';
import { KnowledgeRetrievalService } from './retrieval/knowledge-retrieval.service';
import { WorkspaceContextService } from './context/workspace-context.service';
import { AiApprovalsService } from './approvals/approvals.service';
import { AiToolRegistryService } from './tools/tool-registry.service';
import { AiConversationsService } from './conversations/conversations.service';
import { AgentOrchestratorService } from './orchestration/agent-orchestrator.service';
import { AiController } from './ai.controller';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [AiController],
  providers: [
    MockAiProvider,
    GeminiAiProvider,
    OpenAiProvider,
    AnthropicAiProvider,
    AiProviderRegistry,
    AiUsageService,
    AiTemplatesService,
    KnowledgeRetrievalService,
    WorkspaceContextService,
    AiApprovalsService,
    AiToolRegistryService,
    AiConversationsService,
    AgentOrchestratorService,
  ],
  exports: [
    AiProviderRegistry,
    AiUsageService,
    AgentOrchestratorService,
    AiToolRegistryService,
    KnowledgeRetrievalService,
    WorkspaceContextService,
    AiApprovalsService,
    MockAiProvider,
  ],
})
export class AiModule {}

