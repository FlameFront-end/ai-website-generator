import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Replicate from 'replicate';

import { appConfig } from '../../app/config';

type ReplicateFileOutput = {
  url?: () => URL | string;
};

type ReplicateModelIdentifier =
  | `${string}/${string}`
  | `${string}/${string}:${string}`;

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly replicate: Replicate | null;

  constructor() {
    const imageConfig = appConfig.ai.roles.image;

    this.replicate =
      imageConfig.provider === 'replicate' && imageConfig.apiKey
        ? new Replicate({ auth: imageConfig.apiKey })
        : null;
  }

  async generateImage(
    prompt: string,
  ): Promise<{ image: string; model: string }> {
    const provider = appConfig.ai.roles.image.provider;

    if (provider === 'openai') {
      return this.generateImageViaOpenAI(prompt);
    }

    return this.generateImageViaReplicate(prompt);
  }

  /* ------------------------------------------------------------------ */
  /*  OpenAI-compatible provider (works with CatGPT-Gateway)             */
  /* ------------------------------------------------------------------ */

  private async generateImageViaOpenAI(
    prompt: string,
  ): Promise<{ image: string; model: string }> {
    const imageConfig = appConfig.ai.roles.image;

    if (!imageConfig.baseUrl) {
      throw new ServiceUnavailableException(
        'AI_IMAGE_BASE_URL must be set when AI_IMAGE_PROVIDER=openai',
      );
    }
    if (!imageConfig.apiKey) {
      throw new ServiceUnavailableException(
        'AI_IMAGE_API_KEY must be set when AI_IMAGE_PROVIDER=openai',
      );
    }

    const model = imageConfig.model || 'dall-e-3';
    const baseUrl = imageConfig.baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/images/generations`;

    this.logger.log(
      `[openai-image] START url=${url} model=${model} promptLength=${prompt.length} timeout=${imageConfig.timeout}ms`,
    );
    this.logger.debug(`[openai-image] prompt preview: ${prompt.slice(0, 200)}`);

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      this.logger.warn(
        `[openai-image] ABORTING after ${imageConfig.timeout}ms`,
      );
      controller.abort();
    }, imageConfig.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${imageConfig.apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
        signal: controller.signal,
      });

      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `[openai-image] response status=${response.status} elapsed=${elapsedMs}ms`,
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `[openai-image] FAIL ${response.status}: ${errorBody.slice(0, 1000)}`,
        );
        throw new Error(
          `OpenAI image API ${response.status}: ${errorBody.slice(0, 500)}`,
        );
      }

      const data = (await response.json()) as {
        data?: Array<{
          b64_json?: string;
          url?: string;
          revised_prompt?: string;
        }>;
      };

      const item = data.data?.[0];
      if (!item) {
        this.logger.error(
          `[openai-image] response body had no data array: ${JSON.stringify(data).slice(0, 500)}`,
        );
        throw new Error('OpenAI image API returned no image data');
      }

      this.logger.log(
        `[openai-image] SUCCESS hasB64=${Boolean(item.b64_json)} hasUrl=${Boolean(item.url)} revisedPrompt="${(item.revised_prompt || '').slice(0, 80)}"`,
      );

      if (item.b64_json) {
        return {
          image: `data:image/png;base64,${item.b64_json}`,
          model,
        };
      }

      if (item.url) {
        return { image: item.url, model };
      }

      throw new Error('OpenAI image API returned neither b64_json nor url');
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[openai-image] ERROR after ${elapsedMs}ms: ${message}`,
      );
      throw new ServiceUnavailableException(
        `OpenAI image generation failed: ${message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Replicate provider                                                 */
  /* ------------------------------------------------------------------ */

  private async generateImageViaReplicate(
    prompt: string,
  ): Promise<{ image: string; model: string }> {
    if (appConfig.ai.roles.image.provider !== 'replicate') {
      throw new ServiceUnavailableException(
        'AI_IMAGE_PROVIDER must be set to replicate or openai for image generation',
      );
    }

    if (!this.replicate) {
      throw new ServiceUnavailableException(
        'AI_IMAGE_API_KEY is not configured',
      );
    }

    const model = this.getImageModel();
    this.logger.log(`Generating image with Replicate model: ${model}`);

    try {
      const output = await this.replicate.run(model, {
        input: {
          prompt,
        },
      });

      const image = this.extractImageUrl(output);

      if (!image) {
        throw new Error('Replicate returned no image URL');
      }

      return { image, model };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `Image generation failed: ${message}`,
      );
    }
  }

  private extractImageUrl(output: unknown): string | null {
    const firstOutput: unknown = Array.isArray(output) ? output[0] : output;

    if (typeof firstOutput === 'string') {
      return firstOutput;
    }

    if (
      firstOutput &&
      typeof firstOutput === 'object' &&
      'url' in firstOutput &&
      typeof (firstOutput as ReplicateFileOutput).url === 'function'
    ) {
      return String((firstOutput as ReplicateFileOutput).url?.());
    }

    return null;
  }

  private getImageModel(): ReplicateModelIdentifier {
    const model = appConfig.ai.roles.image.model.trim();

    if (!/^[^/\s]+\/[^:\s]+(?::\S+)?$/.test(model)) {
      throw new ServiceUnavailableException(
        'AI_IMAGE_MODEL must use Replicate owner/name or owner/name:version format',
      );
    }

    return model as ReplicateModelIdentifier;
  }
}
