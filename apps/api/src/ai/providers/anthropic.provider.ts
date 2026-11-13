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
export class AnthropicAiProvider implements IAiProviderAdapter {
  readonly id = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicAiProvider.name);

  private getApiKey(): string | null {
    return process.env.ANTHROPIC_API_KEY || null;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim().length > 0;
  }

  getAvailableModels(): ModelCapability[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'anthropic');
  }

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in environment variables.');
    }

    const model = request.model.startsWith('claude-') ? request.model : 'claude-3-5-haiku-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const messages = request.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.7,
    };

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Anthropic API error [${response.status}]: ${errorText.substring(0, 300)}`);
        throw new Error(`Anthropic API call failed with status ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        content?: Array<{ text?: string; type?: string }>;
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
        };
      };

      const text = data.content?.filter((c) => c.type === 'text').map((c) => c.text || '').join('') || '';

      const promptTokens = data.usage?.input_tokens || 0;
      const completionTokens = data.usage?.output_tokens || 0;
      const totalTokens = promptTokens + completionTokens;

      return {
        content: text,
        provider: 'anthropic',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Anthropic API request timed out after 30 seconds');
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
