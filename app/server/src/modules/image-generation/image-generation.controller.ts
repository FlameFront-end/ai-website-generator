import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateImageDto } from './dto/generate-image.dto';
import { ImageGenerationService } from './image-generation.service';

@Controller('generate-image')
@UseGuards(JwtAuthGuard)
export class ImageGenerationController {
  constructor(
    private readonly imageGenerationService: ImageGenerationService,
  ) {}

  @Post()
  generateImage(
    @Body() body: GenerateImageDto,
  ): Promise<{ image: string; model: string }> {
    return this.imageGenerationService.generateImage(body.prompt);
  }
}
