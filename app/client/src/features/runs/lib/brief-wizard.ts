import type {
  BriefClarificationAnswer,
  BriefClarificationQuestion,
} from "@/api/services/runs";

export const MAX_CLARIFICATION_STEPS = 5;

export function normalizeAnswerValue(
  question: BriefClarificationQuestion,
  value: unknown,
) {
  if (question.type === "scale") return Number(value || question.min || 1);
  if (question.type === "yes_no") return Boolean(value);
  if (question.type === "multi_choice")
    return Array.isArray(value) ? value : [];
  return String(value ?? "");
}

export function getProgressLabel(answerCount: number) {
  if (answerCount === 0) return "Собираем основу";
  if (answerCount <= 2) return "Уточняем направление";
  if (answerCount < MAX_CLARIFICATION_STEPS) return "Финализируем детали";
  return "Готовим финальный бриф";
}

export function formatAnswerValue(value: BriefClarificationAnswer["value"]) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
}

export function getSuggestedAnswer(question: BriefClarificationQuestion) {
  if (question.suggestedAnswer !== undefined) return question.suggestedAnswer;
  if (question.type === "yes_no") return true;
  if (question.type === "scale") return Math.ceil((question.max ?? 5) / 2);
  if (question.type === "multi_choice")
    return question.options?.slice(0, 2) ?? [];
  if (question.type === "single_choice") return question.options?.[0] ?? "";
  return "";
}

export function buildLocalizedBrief(brief: string, siteLanguage: string) {
  const languageName = siteLanguage === "en" ? "English" : "Russian";

  return [
    `Target site language: ${languageName}`,
    `Generate all user-facing website copy, style option names, style option descriptions, design labels, metadata, and UI labels in ${languageName}.`,
    "Keep internal technical instructions in English.",
    "",
    brief.trim(),
  ].join("\n");
}
