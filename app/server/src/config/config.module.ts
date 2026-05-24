import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { appConfig, type AppConfig } from './config';

/**
 * Registers the entire AppConfig tree under key 'app' so that
 * any service can inject ConfigService and retrieve typed values via
 *   configService.get<AppConfig>('app')
 * or sub-keys like:
 *   configService.get<string>('app.jwt.secret')
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ({ app: appConfig })],
    }),
  ],
  exports: [ConfigModule],
})
export class AppConfigModule {}

/**
 * Helper to extract typed AppConfig from ConfigService.
 */
export function getAppConfig(configService: ConfigService): AppConfig {
  return configService.get<AppConfig>('app')!;
}
