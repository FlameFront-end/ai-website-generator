import type {
  ClarifyBriefResponse,
  Run,
  RunArtifact,
  StyleVariant,
  StyleVariantsResponse,
} from "./services/runs/types";
import type { User } from "./services/auth/auth-types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

// ── User ────────────────────────────────────────────────────────────

export function isUser(value: unknown): value is User {
  return isObject(value) && isString(value.id) && isString(value.email);
}

// ── StyleVariant ────────────────────────────────────────────────────

export function isStyleVariant(value: unknown): value is StyleVariant {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !isString(value.name)) return false;
  if (!Array.isArray(value.colorPalette)) return false;
  return true;
}

export function isStyleVariantsResponse(
  value: unknown,
): value is StyleVariantsResponse {
  if (!isObject(value)) return false;
  if (!Array.isArray(value.variants)) return false;
  return value.variants.every(isStyleVariant);
}

// ── ClarifyBriefResponse ────────────────────────────────────────────

export function isClarifyBriefResponse(
  value: unknown,
): value is ClarifyBriefResponse {
  if (!isObject(value)) return false;
  if (value.status !== "needs_clarification" && value.status !== "ready")
    return false;
  if (!Array.isArray(value.questions)) return false;
  return true;
}

// ── RunArtifact ─────────────────────────────────────────────────────

export function isRunArtifact(value: unknown): value is RunArtifact {
  if (!isObject(value)) return false;
  return isString(value.id) && isString(value.type) && isString(value.path);
}

// ── Run ─────────────────────────────────────────────────────────────

export function isRun(value: unknown): value is Run {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !isString(value.slug) || !isString(value.status))
    return false;
  if (!isString(value.brief) || !isStringOrNull(value.currentStep))
    return false;
  if (!Array.isArray(value.artifacts) || !Array.isArray(value.logs))
    return false;
  return true;
}

// ── Generic parse helper ────────────────────────────────────────────

export function parseJsonSafe<T>(
  raw: string,
  guard: (v: unknown) => v is T,
): T | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
