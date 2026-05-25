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
  return typeof value === "string" ? value : "";
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
  const options = question.options ?? [];

  if (question.type === "multi_choice") {
    if (Array.isArray(question.suggestedAnswer)) {
      const selectedOptions = question.suggestedAnswer
        .map((answer) => findMatchingOption(options, String(answer)))
        .filter((option): option is string => Boolean(option));

      if (selectedOptions.length > 0) return selectedOptions;
    }

    if (typeof question.suggestedAnswer === "string") {
      const selectedOption = findMatchingOption(
        options,
        question.suggestedAnswer,
      );
      if (selectedOption) return [selectedOption];
    }

    return options.slice(0, 2);
  }

  if (question.type === "single_choice") {
    if (typeof question.suggestedAnswer === "string") {
      return (
        findMatchingOption(options, question.suggestedAnswer) ??
        options[0] ??
        ""
      );
    }

    if (Array.isArray(question.suggestedAnswer)) {
      return (
        question.suggestedAnswer
          .map((answer) => findMatchingOption(options, String(answer)))
          .find(Boolean) ??
        options[0] ??
        ""
      );
    }

    return options[0] ?? "";
  }

  if (question.suggestedAnswer !== undefined) return question.suggestedAnswer;
  if (question.type === "yes_no") return true;
  if (question.type === "scale") return Math.ceil((question.max ?? 5) / 2);
  return "";
}

function findMatchingOption(options: string[], answer: string) {
  const normalizedAnswer = normalizeOptionText(answer);

  return options.find((option) => {
    const normalizedOption = normalizeOptionText(option);

    return (
      normalizedOption === normalizedAnswer ||
      normalizedOption.includes(normalizedAnswer) ||
      normalizedAnswer.includes(normalizedOption)
    );
  });
}

function normalizeOptionText(value: string) {
  return value.trim().toLowerCase();
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
