import { getAiSkillById } from './registry';
import { formatAiSkillsForPrompt, selectAiSkills } from './selector';
import type { AiSkill, SelectSkillsInput } from './types';

const DEFAULT_MAX_SKILL_CHARS = 6000;

export function buildSkillContext(
  skillIds: readonly string[],
  maxChars = DEFAULT_MAX_SKILL_CHARS,
): string {
  const skills = skillIds
    .map((id) => getAiSkillById(id))
    .filter((skill): skill is AiSkill => Boolean(skill));

  return limitText(formatAiSkillsForPrompt(skills), maxChars);
}

export function buildSelectedSkillContext(
  input: SelectSkillsInput,
  maxChars = DEFAULT_MAX_SKILL_CHARS,
): string {
  return limitText(formatAiSkillsForPrompt(selectAiSkills(input)), maxChars);
}

export function joinPromptSections(
  ...sections: Array<string | null | undefined>
) {
  return sections
    .map((section) => section?.trim())
    .filter(Boolean)
    .join('\n\n---\n\n');
}

function limitText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars).trim()}\n\n[Skill context truncated to fit prompt budget.]`;
}
