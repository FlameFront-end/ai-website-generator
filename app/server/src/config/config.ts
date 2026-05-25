import { cleanEnv, str, num, bool, url } from 'envalid';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

loadEnv({ path: path.resolve(process.cwd(), '..', '..', '.env'), quiet: true });
loadEnv({ quiet: true });

const env = cleanEnv(process.env, {
  APP_ENV: str({ default: 'local', choices: ['local', 'docker'] }),
  API_PORT: num({ default: 3000 }),
  PORT: num({ default: undefined }),
  CLIENT_ORIGIN: str({ default: '' }),
  DATABASE_URL: url({ default: undefined }),
  POSTGRES_HOST: str({ default: undefined }),
  DB_HOST: str({ default: '' }),
  POSTGRES_PORT: str({ default: undefined }),
  DB_PORT: str({ default: '5432' }),
  POSTGRES_USER: str({ default: undefined }),
  DB_USER: str({ default: 'ai_generator' }),
  POSTGRES_PASSWORD: str({ default: undefined }),
  DB_PASSWORD: str({ default: 'ai_generator' }),
  POSTGRES_DB: str({ default: undefined }),
  DB_NAME: str({ default: 'ai_website_generator' }),
  DB_SYNCHRONIZE: bool({ default: false }),
  DB_LOGGING: bool({ default: false }),
  GENERATED_ROOT: str({ default: '' }),
  JWT_SECRET: str({ devDefault: 'default-secret-change-in-production' }),
  JWT_EXPIRES_IN: str({ default: '7d' }),
  AI_ANALYSIS_PROVIDER: str({
    default: 'lmstudio',
    choices: ['lmstudio', 'openai', 'openrouter', 'llm7', 'gemini'],
  }),
  AI_ANALYSIS_BASE_URL: str({ default: 'http://localhost:1234/v1' }),
  AI_ANALYSIS_API_KEY: str({ default: '' }),
  AI_ANALYSIS_MODEL: str({ default: '' }),
  AI_ANALYSIS_TIMEOUT: str({ default: '' }),
  AI_ANALYSIS_STRICT_JSON: str({ default: '' }),
  AI_IMAGE_PROVIDER: str({
    default: 'openai',
    choices: ['openai'],
  }),
  AI_IMAGE_BASE_URL: str({ default: '' }),
  AI_IMAGE_API_KEY: str({ default: '' }),
  AI_IMAGE_MODEL: str({ default: '' }),
  AI_IMAGE_TIMEOUT: str({ default: '' }),
  AI_IMAGE_STRICT_JSON: str({ default: '' }),
  AI_CODE_PROVIDER: str({
    default: 'lmstudio',
    choices: ['lmstudio', 'openai', 'openrouter', 'llm7', 'gemini'],
  }),
  AI_CODE_BASE_URL: str({ default: 'http://localhost:1234/v1' }),
  AI_CODE_API_KEY: str({ default: '' }),
  AI_CODE_MODEL: str({ default: '' }),
  AI_CODE_TIMEOUT: str({ default: '' }),
  AI_CODE_STRICT_JSON: str({ default: '' }),
  CODE_QUALITY_REFERENCE_URL: str({ default: '' }),
  THROTTLE_TTL: num({ default: 60 }),
  THROTTLE_LIMIT: num({ default: 60 }),
  THROTTLE_AUTH_TTL: num({ default: 60 }),
  THROTTLE_AUTH_LIMIT: num({ default: 10 }),
});

const INSECURE_JWT_SECRET = 'default-secret-change-in-production';

if (env.JWT_SECRET === INSECURE_JWT_SECRET && env.APP_ENV !== 'local') {
  console.warn(
    '[SECURITY] JWT_SECRET is using the insecure development default. ' +
      'Set a strong, unique JWT_SECRET environment variable before deploying.',
  );
}

function defaultForEnvironment<T>(local: T, docker: T): T {
  return env.APP_ENV === 'docker' ? docker : local;
}

function envOrDefault(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function buildDatabaseUrl(): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const host =
    env.POSTGRES_HOST ??
    envOrDefault(env.DB_HOST, defaultForEnvironment('localhost', 'postgres'));
  const port = env.POSTGRES_PORT ?? env.DB_PORT;
  const user = env.POSTGRES_USER ?? env.DB_USER;
  const password = env.POSTGRES_PASSWORD ?? env.DB_PASSWORD;
  const database = env.POSTGRES_DB ?? env.DB_NAME;

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export type AiProviderType =
  | 'lmstudio'
  | 'openai'
  | 'openrouter'
  | 'llm7'
  | 'gemini';
export type AiProviderRole = 'analysis' | 'image' | 'code';

function normalizeTimeout(timeout: string): number | undefined {
  if (!timeout.trim()) {
    return undefined;
  }

  const parsed = Number(timeout);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

function defaultStrictJson(provider: AiProviderType): boolean {
  return provider !== 'llm7';
}

function buildAiRoleConfig(role: AiProviderRole) {
  const prefix = `AI_${role.toUpperCase()}` as
    | 'AI_ANALYSIS'
    | 'AI_IMAGE'
    | 'AI_CODE';

  const provider = env[`${prefix}_PROVIDER`];
  const strictJson =
    normalizeBoolean(env[`${prefix}_STRICT_JSON`]) ??
    defaultStrictJson(provider);

  return Object.freeze({
    provider,
    baseUrl: env[`${prefix}_BASE_URL`],
    apiKey: env[`${prefix}_API_KEY`],
    model: env[`${prefix}_MODEL`],
    timeout: normalizeTimeout(env[`${prefix}_TIMEOUT`]) ?? 120000,
    strictJson,
  });
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
  ai: Readonly<{
    codeQualityReferenceUrl: string;
    roles: Readonly<
      Record<
        AiProviderRole,
        Readonly<{
          provider: AiProviderType;
          baseUrl: string;
          apiKey: string;
          model: string;
          timeout: number;
          strictJson: boolean;
        }>
      >
    >;
  }>;
  throttle: Readonly<{
    ttl: number;
    limit: number;
    authTtl: number;
    authLimit: number;
  }>;
}>;

export const appConfig: AppConfig = Object.freeze({
  server: Object.freeze({
    port: env.PORT ?? env.API_PORT,
    corsOrigin: envOrDefault(
      env.CLIENT_ORIGIN,
      defaultForEnvironment('http://localhost:5173', 'http://localhost:8080'),
    ),
  }),
  database: Object.freeze({
    url: buildDatabaseUrl(),
    synchronize: env.DB_SYNCHRONIZE,
    logging: env.DB_LOGGING,
  }),
  storage: Object.freeze({
    generatedRoot: envOrDefault(
      env.GENERATED_ROOT,
      defaultForEnvironment('generated', '/app/app/server/generated'),
    ),
  }),
  jwt: Object.freeze({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  }),
  ai: Object.freeze({
    codeQualityReferenceUrl: env.CODE_QUALITY_REFERENCE_URL,
    roles: Object.freeze({
      analysis: buildAiRoleConfig('analysis'),
      image: buildAiRoleConfig('image'),
      code: buildAiRoleConfig('code'),
    }),
  }),
  throttle: Object.freeze({
    ttl: env.THROTTLE_TTL,
    limit: env.THROTTLE_LIMIT,
    authTtl: env.THROTTLE_AUTH_TTL,
    authLimit: env.THROTTLE_AUTH_LIMIT,
  }),
});
