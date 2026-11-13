import { Injectable, Logger } from '@nestjs/common';
import {
  IAiProviderAdapter,
  AiCompletionRequest,
  AiCompletionResponse,
  AiStreamChunk,
  ModelCapability,
  MODEL_CATALOG,
} from './ai-provider.interface';

@Injectable()
export class OpenAiProvider implements IAiProviderAdapter {
  readonly id = 'openai' as const;
  private readonly logger = new Logger(OpenAiProvider.name);

  private getApiKey(): string | null {
    return process.env.OPENAI_API_KEY || null;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim().length > 0;
  }

  getAvailableModels(): ModelCapability[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'openai');
  }

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    const model = request.model.startsWith('gpt-') ? request.model : 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`OpenAI API error [${response.status}]: ${errorText.substring(0, 300)}`);
        throw new Error(`OpenAI API call failed with status ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const choice = data.choices?.[0];
      const text = choice?.message?.content || '';

      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;

      return {
        content: text,
        provider: 'openai',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('OpenAI API request timed out after 30 seconds');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *generateStream(request: AiCompletionRequest): AsyncIterable<AiStreamChunk> {
    const full = await this.generateCompletion(request);
    const words = full.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      const isComplete = i === words.length - 1;
      yield {
        delta: words[i] + (isComplete ? '' : ' '),
        isComplete,
        ...(isComplete ? { usage: full.usage } : {}),
      };
    }
  }
}
