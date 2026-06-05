import { isStyleVariant, isStyleVariantsResponse, parseJsonSafe } from "@/api";
import type { StyleVariant } from "@/api/services/runs";

export function parseVariants(content?: string): StyleVariant[] {
  if (!content) return [];
  const parsed = parseJsonSafe(content, isStyleVariantsResponse);
  return parsed?.variants ?? [];
}

export function parseSelectedStyle(content?: string): StyleVariant | null {
  if (!content) return null;
  return parseJsonSafe(content, isStyleVariant);
}
