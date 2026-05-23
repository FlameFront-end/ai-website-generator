const DEV_FALLBACK = "http://localhost:3000/api";

function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;

  if (!raw) {
    if (import.meta.env.PROD) {
      throw new Error(
        "VITE_API_URL is not set. Production builds require an explicit API URL.",
      );
    }
    console.warn(
      `[env] VITE_API_URL is not set, falling back to ${DEV_FALLBACK}`,
    );
    return DEV_FALLBACK;
  }

  try {
    new URL(raw);
  } catch {
    throw new Error(`VITE_API_URL is not a valid URL: "${raw}"`);
  }

  return raw;
}

export const env = {
  API_URL: resolveApiUrl(),
};
