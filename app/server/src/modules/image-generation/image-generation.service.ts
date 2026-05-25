import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';

import { getAppConfig } from '../../config/config.module';
import { extractErrorMessage } from '../../common/utils';
import type { AppConfig } from '../../config/config';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly imageConfig: AppConfig['ai']['roles']['image'];

  constructor(configService: ConfigService) {
    this.imageConfig = getAppConfig(configService).ai.roles.image;
  }

  async generateImage(
    prompt: string,
  ): Promise<{ image: string; model: string }> {
    return this.generateImageViaOpenAI(prompt);
  }

  async editImageRegion(input: {
    imagePath: string;
    mask: Buffer;
    instruction: string;
  }): Promise<{ image: string; model: string }> {
    return this.editImageRegionViaOpenAI(input);
  }

  /* ------------------------------------------------------------------ */
  /*  OpenAI-compatible provider (works with CatGPT-Gateway)             */
  /* ------------------------------------------------------------------ */

  private async generateImageViaOpenAI(
    prompt: string,
  ): Promise<{ image: string; model: string }> {
    const imageConfig = this.imageConfig;

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
      const message = extractErrorMessage(error);
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

  private async editImageRegionViaOpenAI(input: {
    imagePath: string;
    mask: Buffer;
    instruction: string;
  }): Promise<{ image: string; model: string }> {
    const imageConfig = this.imageConfig;

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
    const url = `${baseUrl}/images/edits`;
    const prompt = this.buildImageEditPrompt(input.instruction);

    this.logger.log(
      `[openai-image-edit] START url=${url} model=${model} promptLength=${prompt.length} timeout=${imageConfig.timeout}ms`,
    );

    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      this.logger.warn(
        `[openai-image-edit] ABORTING after ${imageConfig.timeout}ms`,
      );
      controller.abort();
    }, imageConfig.timeout);

    try {
      const imageBuffer = await fs.readFile(input.imagePath);
      const image = new Blob([new Uint8Array(imageBuffer)], {
        type: 'image/png',
      });
      const mask = new Blob([new Uint8Array(input.mask)], {
        type: 'image/svg+xml',
      });
      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('n', '1');
      formData.append('size', '1024x1024');
      formData.append('response_format', 'b64_json');
      formData.append('image', image, 'image.png');
      formData.append('mask', mask, 'mask.svg');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${imageConfig.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `[openai-image-edit] response status=${response.status} elapsed=${elapsedMs}ms`,
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `[openai-image-edit] FAIL ${response.status}: ${errorBody.slice(0, 1000)}`,
        );
        throw new Error(
          `OpenAI image edit API ${response.status}: ${errorBody.slice(0, 500)}`,
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
        throw new Error('OpenAI image edit API returned no image data');
      }

      if (item.b64_json) {
        return {
          image: `data:image/png;base64,${item.b64_json}`,
          model,
        };
      }

      if (item.url) {
        return { image: item.url, model };
      }

      throw new Error(
        'OpenAI image edit API returned neither b64_json nor url',
      );
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const message = extractErrorMessage(error);
      this.logger.error(
        `[openai-image-edit] ERROR after ${elapsedMs}ms: ${message}`,
      );
      throw new ServiceUnavailableException(
        `OpenAI image editing failed: ${message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private buildImageEditPrompt(instruction: string): string {
    return [
      'Edit only the masked region of this website reference image.',
      'Keep all unmasked areas unchanged.',
      'Preserve the existing layout, visual style, colors, typography, spacing, shadows, and composition.',
      'The output must remain a clean website UI reference screenshot.',
      '',
      'User instruction:',
      instruction,
    ].join('\n');
  }
}
