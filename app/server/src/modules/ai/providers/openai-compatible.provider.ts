import { Injectable, Logger } from '@nestjs/common';

import { appConfig } from '../../../app/config';
import type {
  AiProvider,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './ai-provider.interface';

interface OpenAiChatResponse {
  choices: {
    message: { content: string };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAiCompatibleProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor() {
    const cfg = appConfig.ai;
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
    this.apiKey = cfg.apiKey;
    this.model = cfg.model;
    this.timeout = cfg.timeout;

    this.logger.log(
      `AI provider: ${cfg.provider} | base: ${this.baseUrl} | model: ${this.model || '(default)'}`,
    );
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      messages: options.messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (this.model) {
      body.model = this.model;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    this.logger.debug(`→ POST ${url} (${options.messages.length} messages)`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `AI API error ${response.status}: ${errorText.slice(0, 500)}`,
        );
      }

      const data = (await response.json()) as OpenAiChatResponse;
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error('AI API returned empty choices');
      }

      this.logger.debug(
        `← ${choice.finish_reason} | tokens: ${data.usage?.total_tokens ?? '?'}`,
      );

      return {
        content: choice.message.content,
        finishReason: choice.finish_reason,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
