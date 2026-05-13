import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateImageDto } from './dto/generate-image.dto';
import { ImagesService } from './images.service';

@Controller('generate-image')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post()
  generateImage(@Body() body: GenerateImageDto) {
    return this.imagesService.generateImage(body.prompt);
  }
}
