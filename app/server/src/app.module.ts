import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { createTypeOrmModuleOptions } from './db/data-source';
import { RunsModule } from './modules/runs/runs.module';

@Module({
  imports: [TypeOrmModule.forRoot(createTypeOrmModuleOptions()), RunsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
