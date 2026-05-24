import { Module } from '@nestjs/common';

import { FileSystemService } from './filesystem.service';
import { StorageService } from './storage.service';

@Module({
  providers: [FileSystemService, StorageService],
  exports: [FileSystemService, StorageService],
})
export class StorageModule {}
