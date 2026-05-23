import { toast } from "react-toastify";

import { logger } from "./logger";

type Validator<T> = (value: unknown) => value is T;

function getJSON<T>(key: string, validate: Validator<T>): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    handleCorrupted(key, "invalid JSON");
    return null;
  }

  if (validate(parsed)) return parsed;

  handleCorrupted(key, "failed validation");
  return null;
}

function setJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error("safe-storage:write", error, { key });
  }
}

function getString(key: string): string | null {
  return localStorage.getItem(key);
}

function setString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    logger.error("safe-storage:write", error, { key });
  }
}

function remove(key: string): void {
  localStorage.removeItem(key);
}

function handleCorrupted(key: string, reason: string): void {
  logger.warn("safe-storage:corrupted", `Removing "${key}": ${reason}`);
  localStorage.removeItem(key);
  toast.warn("Локальные данные повреждены и были сброшены", { toastId: `corrupted:${key}` });
}

export const safeStorage = { getJSON, setJSON, getString, setString, remove };
