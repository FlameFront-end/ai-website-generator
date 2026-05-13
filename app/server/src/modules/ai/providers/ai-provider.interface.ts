export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Request JSON output (sets response_format) */
  json?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type AiProviderRole = 'analysis' | 'image' | 'code';

export interface AiProviderConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeout: number;
  strictJson: boolean;
}

export interface AiProvider {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
}
