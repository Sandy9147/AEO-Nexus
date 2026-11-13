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
export class GeminiAiProvider implements IAiProviderAdapter {
  readonly id = 'gemini' as const;
  private readonly logger = new Logger(GeminiAiProvider.name);

  private getApiKey(): string | null {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim().length > 0;
  }

  getAvailableModels(): ModelCapability[] {
    return MODEL_CATALOG.filter((m) => m.provider === 'gemini');
  }

  async generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in environment variables.');
    }

    const model = request.model.startsWith('gemini-') ? request.model : 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Format contents according to Google Gemini v1beta API
    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));

    const systemInstruction = request.systemPrompt
      ? { parts: [{ text: request.systemPrompt }] }
      : undefined;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error [${response.status}]: ${errorText.substring(0, 300)}`);
        throw new Error(`Gemini API call failed with status ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
          finishReason?: string;
        }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';

      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = data.usageMetadata?.totalTokenCount || promptTokens + completionTokens;

      return {
        content: text,
        provider: 'gemini',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Gemini API request timed out after 30 seconds');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async *generateStream(request: AiCompletionRequest): AsyncIterable<AiStreamChunk> {
    // For non-streaming fallback or stream representation
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
