import { Logger, ServiceUnavailableException } from '@nestjs/common';

import type {
  AiProvider,
  AiProviderConfig,
  AiProviderRole,
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

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'cause' in error &&
    error.cause &&
    typeof error.cause === 'object' &&
    'code' in error.cause
  ) {
    return String(error.cause.code);
  }

  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }

  return '';
}

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly strictJson: boolean;

  constructor(
    private readonly role: AiProviderRole,
    cfg: AiProviderConfig,
  ) {
    this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
    this.apiKey = cfg.apiKey;
    this.model = cfg.model;
    this.timeout = cfg.timeout;
    this.strictJson = cfg.strictJson;

    this.logger.log(
      `AI ${this.role}: ${cfg.provider} | base: ${this.baseUrl} | model: ${this.model || '(default)'}`,
    );
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      messages: options.messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.json && this.strictJson) {
      body.response_format = { type: 'json_object' };
    }

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

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
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
          const message = `AI API error ${response.status}: ${errorText.slice(0, 500)}`;

          if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
            lastError = new Error(message);
            this.logger.warn(
              `AI API temporary error, retrying ${attempt}/${MAX_ATTEMPTS}: ${message}`,
            );
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }

          throw new Error(message);
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
      } catch (error) {
        lastError = error;

        if (attempt >= MAX_ATTEMPTS) {
          break;
        }

        this.logger.warn(
          `AI request failed, retrying ${attempt}/${MAX_ATTEMPTS}: ${getErrorCode(error) || getErrorMessage(error)}`,
        );
        await sleep(RETRY_DELAY_MS * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ServiceUnavailableException(
      `AI provider is temporarily unavailable: ${getErrorCode(lastError) || getErrorMessage(lastError)}`,
    );
  }
}
