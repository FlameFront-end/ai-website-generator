import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { getAppConfig } from './config/config.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const GLOBAL_PREFIX = 'api';
const SWAGGER_PATH = `${GLOBAL_PREFIX}/docs`;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = getAppConfig(app.get(ConfigService));

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.enableCors({
    origin: Array.from(
      new Set([config.server.corsOrigin, 'http://localhost:5174']),
    ),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Website Generator API')
    .setDescription('Backend API for AI Website Generator')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
  });

  await app.listen(config.server.port);
  const logger = new Logger('Bootstrap');
  const serverUrl = `http://localhost:${config.server.port}`;
  logger.log(`Server listening at ${serverUrl}`);
  logger.log(`API base URL: ${serverUrl}/${GLOBAL_PREFIX}`);
  logger.log(`Swagger UI: ${serverUrl}/${SWAGGER_PATH}`);
  logger.log(`Swagger JSON: ${serverUrl}/${SWAGGER_PATH}-json`);
}
void bootstrap();
