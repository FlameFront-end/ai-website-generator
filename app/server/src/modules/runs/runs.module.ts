import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  RunArtifactEntity,
  RunEntity,
  RunLogEntity,
  UserEntity,
} from '../../db/entities';
import { PipelineModule } from '../pipeline/pipeline.module';
import { StorageModule } from '../storage/storage.module';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';

@Module({
  imports: [
    StorageModule,
    PipelineModule,
    TypeOrmModule.forFeature([
      RunEntity,
      RunArtifactEntity,
      RunLogEntity,
      UserEntity,
    ]),
  ],
  controllers: [RunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
