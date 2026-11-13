export type AiProviderType = 'gemini' | 'openai' | 'anthropic';

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  name?: string;
}

export interface AiCompletionRequest {
  provider?: AiProviderType;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  workspaceId: string; // Mandatory workspace isolation tag for audit and billing
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
}

export interface IAiService {
  generateCompletion(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}
