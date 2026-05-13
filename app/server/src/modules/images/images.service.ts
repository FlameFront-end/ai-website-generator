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

type ReplicateModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

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

  async generateImage(prompt: string): Promise<{ image: string; model: string }> {
    if (appConfig.ai.roles.image.provider !== 'replicate') {
      throw new ServiceUnavailableException(
        'AI_IMAGE_PROVIDER must be set to replicate for image generation',
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
    const firstOutput = Array.isArray(output) ? output[0] : output;

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
