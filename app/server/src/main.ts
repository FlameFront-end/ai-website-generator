import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { appConfig } from './app/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: appConfig.server.corsOrigin,
  });

  await app.listen(appConfig.server.port);
}
void bootstrap();
