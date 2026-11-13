export type AiProviderType = 'gemini' | 'openai' | 'anthropic' | 'mock';

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCallCitation {
  documentId: string;
  title: string;
  snippet?: string;
  url?: string;
}

export interface ToolCallExecution {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status?: 'SUCCESS' | 'FAILED' | 'REQUIRES_APPROVAL';
  error?: string;
}

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  name?: string;
  citations?: ToolCallCitation[];
  toolCalls?: ToolCallExecution[];
}

export interface AiStreamChunk {
  delta: string;
  isComplete: boolean;
  toolCalls?: ToolCallExecution[];
  citations?: ToolCallCitation[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiCompletionRequest {
  provider?: AiProviderType;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  workspaceId: string; // Mandatory workspace isolation tag for audit and billing
  systemPrompt?: string;
  tools?: AiToolDefinition[];
  stream?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  provider: AiProviderType;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: ToolCallExecution[];
  citations?: ToolCallCitation[];
}

export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ModelCapability {
  id: string;
  provider: AiProviderType;
  name: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsJsonOutput: boolean;
  inputCostPer1M: number;  // In USD
  outputCostPer1M: number; // In USD
}

export const MODEL_CATALOG: ModelCapability[] = [
  // Google Gemini
  {
    id: 'gemini-1.5-flash',
    provider: 'gemini',
    name: 'Gemini 1.5 Flash',
    description: 'Ultra-fast multimodal model optimized for real-time customer co-pilot and tool execution.',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'gemini',
    name: 'Gemini 1.5 Pro',
    description: 'High-capability model for complex multi-step business strategy and deep document analysis.',
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
  },
  {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    name: 'Gemini 2.0 Flash',
    description: 'Next-gen real-time reasoning agent with low latency and enhanced tool handling.',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
  },
  // OpenAI
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    description: 'Fast, cost-effective multimodal model for high-frequency workspace tasks.',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    description: 'Flagship omni-model for executive business reasoning, marketing copy, and coding.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
  },
  // Anthropic
  {
    id: 'claude-3-5-haiku',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku',
    description: 'Lightning-fast agent model with high precision and rapid response times.',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
  },
  {
    id: 'claude-3-5-sonnet',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    description: 'Industry-leading reasoning and nuanced communication for strategic enterprise operations.',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
  // Mock / Deterministic Testing Fallback
  {
    id: 'mock-agent-fast',
    provider: 'mock',
    name: 'AEO Nexus Embedded Agent',
    description: 'Built-in deterministic operational simulator for testing and offline development.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsJsonOutput: true,
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
  },
];

export interface IAiProviderAdapter {
  readonly id: AiProviderType;
  isConfigured(): boolean;
  generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse>;
  generateStream?(request: AiCompletionRequest): AsyncIterable<AiStreamChunk>;
  getAvailableModels(): ModelCapability[];
}

export interface IAiService {
  generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
