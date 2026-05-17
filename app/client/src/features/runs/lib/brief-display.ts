const TECHNICAL_BRIEF_PREFIX_LINES = [
  /^Target site language:\s*(Russian|English)\s*$/i,
  /^Generate all user-facing website copy, style option names, style option descriptions, design labels, metadata, and UI labels in (Russian|English)\.\s*$/i,
  /^Keep internal technical instructions in English\.\s*$/i,
];

export function stripTechnicalBriefPrefix(brief: string) {
  const normalized = brief.trimStart();

  if (/^Target site language:/i.test(normalized)) {
    const withoutTechnicalBlock = normalized.replace(
      /^Target site language:[\s\S]*?(?:\r?\n\s*\r?\n|$)/i,
      "",
    );

    return withoutTechnicalBlock.trim();
  }

  const lines = brief.split(/\r?\n/);
  let index = 0;

  while (
    index < lines.length &&
    (lines[index].trim() === "" ||
      TECHNICAL_BRIEF_PREFIX_LINES.some((pattern) =>
        pattern.test(lines[index].trim()),
      ))
  ) {
    index += 1;
  }

  return lines.slice(index).join("\n").trim();
}
