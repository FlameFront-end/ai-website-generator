export function formatTokenValue(value: unknown): string {
  if (value == null) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.map(formatTokenValue).join(", ");
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${key}: ${formatTokenValue(nestedValue)}`)
      .join("; ");
  }

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "—";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
