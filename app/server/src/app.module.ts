import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createTypeOrmModuleOptions } from './db/data-source';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CodeGeneratorModule } from './modules/code-generator/code-generator.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { RunsModule } from './modules/runs/runs.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createTypeOrmModuleOptions()),
    AiModule,
    CodeGeneratorModule,
    StorageModule,
    PipelineModule,
    AuthModule,
    RunsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
