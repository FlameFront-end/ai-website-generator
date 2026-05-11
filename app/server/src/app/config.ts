import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(process.cwd(), '..', '..', '.env'), quiet: true });
loadEnv({ quiet: true });

type EnvName = keyof NodeJS.ProcessEnv | string;

export type AppConfig = Readonly<{
  server: Readonly<{
    port: number;
    corsOrigin: string;
  }>;
  database: Readonly<{
    url: string;
    synchronize: boolean;
    logging: boolean;
  }>;
  storage: Readonly<{
    generatedRoot: string;
  }>;
}>;

function readEnv(name: EnvName): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function readString(name: EnvName, defaultValue: string): string {
  return readEnv(name) ?? defaultValue;
}

function readInteger(name: EnvName, defaultValue: number, minimum = 0): number {
  const rawValue = readString(name, String(defaultValue));
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`Environment variable ${name} must be an integer >= ${minimum}`);
  }

  return value;
}

function readBoolean(name: EnvName, defaultValue: boolean): boolean {
  const value = readEnv(name);

  if (value === undefined) {
    return defaultValue;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${name} must be either "true" or "false"`);
}

function buildDatabaseUrl(): string {
  const directUrl = readEnv('DATABASE_URL');

  if (directUrl) {
    return directUrl;
  }

  const host = readString('POSTGRES_HOST', readString('DB_HOST', 'localhost'));
  const port = readString('POSTGRES_PORT', readString('DB_PORT', '5432'));
  const user = readString('POSTGRES_USER', readString('DB_USER', 'ai_generator'));
  const password = readString('POSTGRES_PASSWORD', readString('DB_PASSWORD', 'ai_generator'));
  const database = readString('POSTGRES_DB', readString('DB_NAME', 'ai_website_generator'));

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export const appConfig: AppConfig = Object.freeze({
  server: Object.freeze({
    port: readInteger('API_PORT', readInteger('PORT', 3000), 1),
    corsOrigin: readString('CLIENT_ORIGIN', 'http://localhost:5173'),
  }),
  database: Object.freeze({
    url: buildDatabaseUrl(),
    synchronize: readBoolean('DB_SYNCHRONIZE', true),
    logging: readBoolean('DB_LOGGING', false),
  }),
  storage: Object.freeze({
    generatedRoot: readString('GENERATED_ROOT', 'generated/runs'),
  }),
});
