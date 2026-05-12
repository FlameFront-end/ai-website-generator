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

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
}
