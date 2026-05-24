export type ChatContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'image_url';
      image_url: { url: string; detail?: 'low' | 'high' | 'auto' };
    };

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatContentPart[];
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

export type { AiProviderRole } from '../../../config/config';

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
