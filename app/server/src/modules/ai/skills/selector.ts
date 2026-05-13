import { AI_SKILLS } from './registry';
import type { AiSkill, SelectSkillsInput } from './types';

export function selectAiSkills(input: SelectSkillsInput): AiSkill[] {
  const previousSkillIds = new Set(input.previousSkillIds ?? []);
  const normalizedSearchText = normalizeSearchText([
    input.projectType,
    input.framework,
    input.errorText,
  ]);

  const scoredSkills = AI_SKILLS.filter((skill) =>
    skill.appliesTo.includes(input.step),
  )
    .filter((skill) => !previousSkillIds.has(skill.id))
    .map((skill) => ({
      skill,
      score: scoreSkill(skill, normalizedSearchText, input),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.skill.priority - a.skill.priority);

  const selected: AiSkill[] = [];
  let usedBudget = 0;

  for (const entry of scoredSkills) {
    if (usedBudget + entry.skill.tokenBudget > input.tokenBudget) {
      continue;
    }

    selected.push(entry.skill);
    usedBudget += entry.skill.tokenBudget;
  }

  return selected;
}

export function formatAiSkillsForPrompt(skills: readonly AiSkill[]): string {
  if (skills.length === 0) {
    return 'No additional AI skills selected for this step.';
  }

  return skills
    .map((skill) => `## ${skill.id}: ${skill.title}\n${skill.content}`)
    .join('\n\n');
}

function scoreSkill(
  skill: AiSkill,
  normalizedSearchText: string,
  input: SelectSkillsInput,
): number {
  let score = skill.priority;

  for (const trigger of skill.triggers) {
    if (normalizedSearchText.includes(trigger.toLowerCase())) {
      score += 25;
    }
  }

  if (input.framework === 'next' && skill.triggers.includes('next')) {
    score += 20;
  }

  if (input.errorText && skill.kind === 'build') {
    score += 15;
  }

  return score;
}

function normalizeSearchText(values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ').toLowerCase();
}
