import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfigModule, getAppConfig } from './app/app-config.module';
import { AppService } from './app.service';
import { createTypeOrmModuleOptions } from './db/data-source';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CodeGeneratorModule } from './modules/code-generator/code-generator.module';
import { HealthModule } from './modules/health/health.module';
import { ImagesModule } from './modules/images/images.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { RunsModule } from './modules/runs/runs.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const { throttle } = getAppConfig(configService);
        return [
          { name: 'default', ttl: throttle.ttl * 1000, limit: throttle.limit },
          {
            name: 'auth',
            ttl: throttle.authTtl * 1000,
            limit: throttle.authLimit,
          },
        ];
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRoot(createTypeOrmModuleOptions()),
    AiModule,
    CodeGeneratorModule,
    HealthModule,
    ImagesModule,
    StorageModule,
    PipelineModule,
    AuthModule,
    RunsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, AppService],
})
export class AppModule {}
