import { cleanEnv, str, num, bool, url } from 'envalid';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(process.cwd(), '..', '..', '.env'), quiet: true });
loadEnv({ quiet: true });

const env = cleanEnv(process.env, {
  API_PORT: num({ default: 3000 }),
  PORT: num({ default: undefined }),
  CLIENT_ORIGIN: str({ default: 'http://localhost:5173' }),
  DATABASE_URL: url({ default: undefined }),
  POSTGRES_HOST: str({ default: undefined }),
  DB_HOST: str({ default: 'localhost' }),
  POSTGRES_PORT: str({ default: undefined }),
  DB_PORT: str({ default: '5432' }),
  POSTGRES_USER: str({ default: undefined }),
  DB_USER: str({ default: 'ai_generator' }),
  POSTGRES_PASSWORD: str({ default: undefined }),
  DB_PASSWORD: str({ default: 'ai_generator' }),
  POSTGRES_DB: str({ default: undefined }),
  DB_NAME: str({ default: 'ai_website_generator' }),
  DB_SYNCHRONIZE: bool({ default: true }),
  DB_LOGGING: bool({ default: false }),
  GENERATED_ROOT: str({ default: 'generated' }),
  JWT_SECRET: str({ default: 'default-secret-change-in-production' }),
  JWT_EXPIRES_IN: str({ default: '7d' }),
});

function buildDatabaseUrl(): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const host = env.POSTGRES_HOST ?? env.DB_HOST;
  const port = env.POSTGRES_PORT ?? env.DB_PORT;
  const user = env.POSTGRES_USER ?? env.DB_USER;
  const password = env.POSTGRES_PASSWORD ?? env.DB_PASSWORD;
  const database = env.POSTGRES_DB ?? env.DB_NAME;

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

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
  jwt: Readonly<{
    secret: string;
    expiresIn: string;
  }>;
}>;

export const appConfig: AppConfig = Object.freeze({
  server: Object.freeze({
    port: env.PORT ?? env.API_PORT,
    corsOrigin: env.CLIENT_ORIGIN,
  }),
  database: Object.freeze({
    url: buildDatabaseUrl(),
    synchronize: env.DB_SYNCHRONIZE,
    logging: env.DB_LOGGING,
  }),
  storage: Object.freeze({
    generatedRoot: env.GENERATED_ROOT,
  }),
  jwt: Object.freeze({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  }),
});
