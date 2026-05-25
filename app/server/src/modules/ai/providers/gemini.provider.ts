import { Logger, ServiceUnavailableException } from '@nestjs/common';

import { extractErrorMessage, sleep } from '../../../common/utils';
import type {
  AiProvider,
  AiProviderConfig,
  AiProviderRole,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatContentPart,
  ChatMessage,
} from './ai-provider.interface';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

function toGeminiParts(content: ChatMessage['content']): GeminiPart[] {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  return content.map((part: ChatContentPart) => {
    if (part.type === 'text') {
      return { text: part.text };
    }

    const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return { text: `Image URL reference: ${part.image_url.url}` };
    }

    return {
      inlineData: {
        mimeType: match[1],
        data: match[2],
      },
    };
  });
}

function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction?: { parts: GeminiPart[] };
  contents: GeminiContent[];
} {
  const systemParts: GeminiPart[] = [];
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    const parts = toGeminiParts(message.content);

    if (message.role === 'system') {
      systemParts.push(...parts);
      continue;
    }

    contents.push({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  return {
    systemInstruction: systemParts.length ? { parts: systemParts } : undefined,
    contents,
  };
}

export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(
    private readonly role: AiProviderRole,
    cfg: AiProviderConfig,
  ) {
    this.baseUrl = (
      cfg.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    this.apiKey = cfg.apiKey;
    this.model = cfg.model || 'gemini-2.5-pro';
    this.timeout = cfg.timeout;

    this.logger.log(
      `AI ${this.role}: gemini | base: ${this.baseUrl} | model: ${this.model}`,
    );
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Gemini API key is not configured');
    }

    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const { systemInstruction, contents } = toGeminiContents(options.messages);
    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxTokens ?? 4096,
        ...(options.json ? { responseMimeType: 'application/json' } : {}),
      },
      ...(systemInstruction ? { systemInstruction } : {}),
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const message = `Gemini API error ${response.status}: ${errorText.slice(0, 500)}`;

          if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
            lastError = new Error(message);
            this.logger.warn(
              `Gemini temporary error, retrying ${attempt}/${MAX_ATTEMPTS}: ${message}`,
            );
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }

          throw new Error(message);
        }

        const data = (await response.json()) as GeminiResponse;
        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts
          ?.map((part) => part.text ?? '')
          .join('')
          .trim();

        if (!content) {
          throw new Error('Gemini returned empty content');
        }

        return {
          content,
          finishReason: candidate?.finishReason ?? 'unknown',
          usage: data.usageMetadata
            ? {
                promptTokens: data.usageMetadata.promptTokenCount ?? 0,
                completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
                totalTokens: data.usageMetadata.totalTokenCount ?? 0,
              }
            : undefined,
        };
      } catch (error) {
        lastError = error;
        if (attempt >= MAX_ATTEMPTS) break;
        this.logger.warn(
          `Gemini request failed, retrying ${attempt}/${MAX_ATTEMPTS}: ${extractErrorMessage(error)}`,
        );
        await sleep(RETRY_DELAY_MS * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ServiceUnavailableException(
      `Gemini provider is temporarily unavailable: ${extractErrorMessage(lastError)}`,
    );
  }
}
