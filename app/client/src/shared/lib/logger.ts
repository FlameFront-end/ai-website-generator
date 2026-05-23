type LogContext = Record<string, unknown>;

function sanitize(ctx: LogContext): LogContext {
  const REDACTED_KEYS = new Set([
    "password",
    "token",
    "accessToken",
    "authorization",
    "secret",
    "cookie",
  ]);

  const clean: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    clean[key] = REDACTED_KEYS.has(key) ? "[REDACTED]" : value;
  }
  return clean;
}

function extractErrorInfo(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { raw: String(error) };
}

export const logger = {
  error(label: string, error: unknown, context?: LogContext) {
    const info = extractErrorInfo(error);
    const ctx = context ? sanitize(context) : undefined;

    if (import.meta.env.DEV) {
      console.error(`[${label}]`, { ...info, ...ctx });
    }
  },

  warn(label: string, message: string, context?: LogContext) {
    const ctx = context ? sanitize(context) : undefined;

    if (import.meta.env.DEV) {
      console.warn(`[${label}]`, message, ctx);
    }
  },

  info(label: string, message: string, context?: LogContext) {
    const ctx = context ? sanitize(context) : undefined;

    if (import.meta.env.DEV) {
      console.info(`[${label}]`, message, ctx);
    }
  },
};
