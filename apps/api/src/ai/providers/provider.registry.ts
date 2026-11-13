import { Injectable, Logger } from '@nestjs/common';
import {
  AiProviderType,
  IAiProviderAdapter,
  ModelCapability,
  MODEL_CATALOG,
} from './ai-provider.interface';
import { MockAiProvider } from './mock.provider';
import { GeminiAiProvider } from './gemini.provider';
import { OpenAiProvider } from './openai.provider';
import { AnthropicAiProvider } from './anthropic.provider';
import { AiProviderStatusDto } from '@aeo-nexus/contracts';

@Injectable()
export class AiProviderRegistry {
  private readonly logger = new Logger(AiProviderRegistry.name);
  private readonly adapters: Map<AiProviderType, IAiProviderAdapter> = new Map();

  constructor(
    private readonly mockProvider: MockAiProvider,
    private readonly geminiProvider: GeminiAiProvider,
    private readonly openAiProvider: OpenAiProvider,
    private readonly anthropicProvider: AnthropicAiProvider,
  ) {
    this.adapters.set('mock', this.mockProvider);
    this.adapters.set('gemini', this.geminiProvider);
    this.adapters.set('openai', this.openAiProvider);
    this.adapters.set('anthropic', this.anthropicProvider);
  }

  getAdapter(providerType?: string): IAiProviderAdapter {
    if (providerType && this.adapters.has(providerType as AiProviderType)) {
      const adapter = this.adapters.get(providerType as AiProviderType)!;
      if (adapter.isConfigured()) {
        return adapter;
      }
      this.logger.warn(
        `Requested provider "${providerType}" is not configured with valid API keys. Falling back to default available provider.`,
      );
    }

    // Try configured production providers in order of preference: Gemini -> OpenAI -> Anthropic
    if (this.geminiProvider.isConfigured()) return this.geminiProvider;
    if (this.openAiProvider.isConfigured()) return this.openAiProvider;
    if (this.anthropicProvider.isConfigured()) return this.anthropicProvider;

    // Fallback to embedded Mock provider
    return this.mockProvider;
  }

  getProviderStatus(): AiProviderStatusDto[] {
    const providers: Array<{ id: AiProviderType; name: string }> = [
      { id: 'gemini', name: 'Google Gemini' },
      { id: 'openai', name: 'OpenAI' },
      { id: 'anthropic', name: 'Anthropic' },
      { id: 'mock', name: 'AEO Nexus Embedded Agent (Sandbox)' },
    ];

    return providers.map((p) => {
      const adapter = this.adapters.get(p.id)!;
      const isConfigured = adapter.isConfigured();
      const availableModels = MODEL_CATALOG.filter((m) => m.provider === p.id).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        contextWindow: m.contextWindow,
        inputCostPer1M: m.inputCostPer1M,
        outputCostPer1M: m.outputCostPer1M,
      }));

      return {
        id: p.id,
        name: p.name,
        isConfigured,
        availableModels,
      };
    });
  }

  getModelCapability(modelId: string): ModelCapability | undefined {
    return MODEL_CATALOG.find((m) => m.id === modelId);
  }
}

