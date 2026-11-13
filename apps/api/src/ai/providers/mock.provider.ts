import { Injectable, Logger } from '@nestjs/common';
import {
  IAiProviderAdapter,
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamChunk,
  ModelCapability,
  MODEL_CATALOG,
  ToolCallExecution,
  ToolCallCitation,
} from './ai-provider.interface';

@Injectable()
export class MockAiProvider implements IAiProviderAdapter {
  readonly id = 'mock' as const;
  private readonly logger = new Logger(MockAiProvider.name);

  isConfigured(): boolean {
    return true; // Always available as embedded sandbox / offline fallback
  }

  getAvailableModels(): ModelCapability[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'mock');
  }

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const lastUserMessage = [...request.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const lower = lastUserMessage.toLowerCase();

    const toolCalls: ToolCallExecution[] = [];
    const citations: ToolCallCitation[] = [];

    // Smart heuristic: if user asks for specific actions and tools are available, propose tool execution
    if (request.tools && request.tools.length > 0) {
      if (lower.includes('project') && (lower.includes('list') || lower.includes('show') || lower.includes('what'))) {
        toolCalls.push({
          id: `call_${Date.now()}_1`,
          toolName: 'list_workspace_projects',
          args: { limit: 10 },
        });
      } else if (lower.includes('task') && (lower.includes('list') || lower.includes('show') || lower.includes('what'))) {
        toolCalls.push({
          id: `call_${Date.now()}_2`,
          toolName: 'list_assigned_tasks',
          args: { limit: 10 },
        });
      } else if (lower.includes('profile') || lower.includes('business')) {
        toolCalls.push({
          id: `call_${Date.now()}_3`,
          toolName: 'get_business_profile',
          args: {},
        });
      } else if (lower.includes('brand') || lower.includes('color') || lower.includes('voice')) {
        toolCalls.push({
          id: `call_${Date.now()}_4`,
          toolName: 'get_brand_identity',
          args: {},
        });
      } else if (lower.includes('create project') || lower.includes('new project') || lower.includes('draft project')) {
        toolCalls.push({
          id: `call_${Date.now()}_5`,
          toolName: 'create_draft_project',
          args: {
            name: 'Q1 Organic Search Optimization',
            description: 'Strategic project created by AI Agent to optimize core landing pages for Answer Engine visibility.',
          },
        });
      } else if (lower.includes('create task') || lower.includes('new task') || lower.includes('draft task')) {
        toolCalls.push({
          id: `call_${Date.now()}_6`,
          toolName: 'create_draft_task',
          args: {
            title: 'Audit FAQ Schema Markup',
            description: 'Inspect published knowledge documents and generate JSON-LD schema for search engines.',
            priority: 'HIGH',
          },
        });
      } else if (lower.includes('search') || lower.includes('knowledge') || lower.includes('doc') || lower.includes('policy')) {
        toolCalls.push({
          id: `call_${Date.now()}_7`,
          toolName: 'search_knowledge_vault',
          args: { query: lastUserMessage.substring(0, 50) },
        });
      }
    }

    let responseContent: string;

    if (toolCalls.length > 0) {
      const toolNames = toolCalls.map((t) => t.toolName).join(', ');
      responseContent = `I have inspected your request and identified that we should retrieve information using the following workspace tools: **${toolNames}**. Executing tools within your verified workspace security perimeter...`;
    } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      responseContent = `Hello! I am your **AEO Nexus AI Business Agent**. I have full contextual awareness of your workspace, active projects, brand guidelines, and knowledge base. How can I assist you with your operations, strategy, or deliverables today?`;
    } else if (lower.includes('who are you') || lower.includes('what can you do')) {
      responseContent = `I am the **AEO Nexus AI Business Agent** — an autonomous co-pilot built to operate your business systems. I can inspect your business profile, query your knowledge vault with strict citations, track active projects, organize tasks, search available tools, and draft deliverables. Sensitive actions (such as publishing content or deleting data) will always request your explicit approval.`;
    } else {
      responseContent = `I have analyzed your request: "${lastUserMessage}". Working within your workspace boundary, I can coordinate your team's deliverables, search our verified business knowledge vault, or initiate strategic drafts. Let me know if you would like me to create a task, query your business profile, or review active projects.`;
    }

    const promptTokens = Math.max(15, Math.ceil(lastUserMessage.length / 4));
    const completionTokens = Math.max(25, Math.ceil(responseContent.length / 4));

    return {
      content: responseContent,
      provider: 'mock',
      model: request.model || 'mock-agent-fast',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      citations: citations.length > 0 ? citations : undefined,
    };
  }

  async *generateStream(request: AiCompletionRequest): AsyncIterable<AiStreamChunk> {
    const full = await this.generateCompletion(request);
    const words = full.content.split(' ');

    for (let i = 0; i < words.length; i++) {
      const isComplete = i === words.length - 1;
      yield {
        delta: words[i] + (isComplete ? '' : ' '),
        isComplete,
        ...(isComplete ? { toolCalls: full.toolCalls, citations: full.citations, usage: full.usage } : {}),
      };
    }
  }
}
