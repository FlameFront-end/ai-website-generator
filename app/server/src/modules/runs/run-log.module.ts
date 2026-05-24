import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RunLogEntity } from '../../db/entities';
import { RunLogService } from './run-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([RunLogEntity])],
  providers: [RunLogService],
  exports: [RunLogService],
})
export class RunLogModule {}
