import 'reflect-metadata';

import path from 'node:path';

import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';

import { appConfig } from '../app/config';
import { dbEntities } from './entities';

function toGlobPath(...segments: string[]): string {
  return path.join(...segments).replaceAll('\\', '/');
}

export function createTypeOrmDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: appConfig.database.url,
    synchronize: appConfig.database.synchronize,
    logging: appConfig.database.logging,
    entities: [...dbEntities],
    migrations: [toGlobPath(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
  };
}

export function createTypeOrmModuleOptions(): TypeOrmModuleOptions {
  return createTypeOrmDataSourceOptions();
}

export const appDataSource = new DataSource(createTypeOrmDataSourceOptions());
