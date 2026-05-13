import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { AiSkill } from './types';

const SKILLS_PACK_DIR = 'ai-website-generator-repo-skills-pack';

type SkillDefinition = Omit<AiSkill, 'content'> & {
  sourcePath: string;
};

const SKILL_DEFINITIONS: readonly SkillDefinition[] = [
  {
    id: 'product-global-rules',
    title: 'Global product rules',
    kind: 'design',
    appliesTo: ['spec', 'design', 'reference', 'code', 'build', 'qa'],
    priority: 100,
    tokenBudget: 1200,
    triggers: ['visual-first', 'landing', 'product', 'global'],
    sourcePath: 'skills/product/00-global-product-rules.md',
  },
  {
    id: 'brief-and-structure',
    title: 'Brief and landing page structure',
    kind: 'copy',
    appliesTo: ['spec'],
    priority: 95,
    tokenBudget: 1000,
    triggers: ['brief', 'spec', 'structure', 'sections', 'clarify'],
    sourcePath: 'skills/product/01-brief-and-structure.md',
  },
  {
    id: 'image-generation-workflow',
    title: 'Section-by-section image generation workflow',
    kind: 'visual',
    appliesTo: ['design', 'reference'],
    priority: 98,
    tokenBudget: 1400,
    triggers: ['image', 'reference', 'section', 'blocks', 'visual'],
    sourcePath: 'skills/product/02-image-generation-workflow.md',
  },
  {
    id: 'design-system-assets',
    title: 'Design system and asset rules',
    kind: 'design',
    appliesTo: ['design', 'reference', 'code'],
    priority: 90,
    tokenBudget: 900,
    triggers: ['tokens', 'assets', 'svg', 'design', 'responsive'],
    sourcePath: 'skills/product/03-design-system-assets.md',
  },
  {
    id: 'image-to-code',
    title: 'Image to frontend code',
    kind: 'code',
    appliesTo: ['code'],
    priority: 98,
    tokenBudget: 1200,
    triggers: ['code', 'frontend', 'next', 'tailwind', 'approved block images'],
    sourcePath: 'skills/product/04-image-to-code.md',
  },
  {
    id: 'build-qa-repair-export',
    title: 'Build, QA, repair and export',
    kind: 'build',
    appliesTo: ['build', 'qa'],
    priority: 96,
    tokenBudget: 1100,
    triggers: ['build', 'qa', 'repair', 'screenshot', 'export'],
    sourcePath: 'skills/product/05-build-qa-repair-export.md',
  },
  {
    id: 'taste-image-to-code',
    title: 'Taste Skill: image-to-code',
    kind: 'code',
    appliesTo: ['code'],
    priority: 88,
    tokenBudget: 2200,
    triggers: ['image-to-code', 'visual fidelity', 'frontend taste'],
    sourcePath: 'vendor/taste-skill/skills/image-to-code-skill/SKILL.md',
  },
  {
    id: 'taste-imagegen-frontend-web',
    title: 'Taste Skill: frontend web image generation',
    kind: 'visual',
    appliesTo: ['reference'],
    priority: 90,
    tokenBudget: 2200,
    triggers: ['imagegen', 'frontend web', 'visual reference'],
    sourcePath: 'vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md',
  },
  {
    id: 'taste-imagegen-frontend-mobile',
    title: 'Taste Skill: frontend mobile image generation',
    kind: 'visual',
    appliesTo: ['reference', 'qa'],
    priority: 70,
    tokenBudget: 1800,
    triggers: ['mobile', 'responsive', 'imagegen'],
    sourcePath: 'vendor/taste-skill/skills/imagegen-frontend-mobile/SKILL.md',
  },
  {
    id: 'taste-output',
    title: 'Taste Skill: output completeness',
    kind: 'build',
    appliesTo: ['code', 'build'],
    priority: 76,
    tokenBudget: 1400,
    triggers: ['output', 'complete code', 'missing files'],
    sourcePath: 'vendor/taste-skill/skills/output-skill/SKILL.md',
  },
  {
    id: 'taste-redesign',
    title: 'Taste Skill: redesign repair',
    kind: 'visual',
    appliesTo: ['qa'],
    priority: 80,
    tokenBudget: 1600,
    triggers: ['redesign', 'repair', 'visual fix'],
    sourcePath: 'vendor/taste-skill/skills/redesign-skill/SKILL.md',
  },
  {
    id: 'taste-visual-quality',
    title: 'Taste Skill: visual quality',
    kind: 'visual',
    appliesTo: ['design', 'reference', 'qa'],
    priority: 82,
    tokenBudget: 1800,
    triggers: ['taste', 'visual quality', 'polish'],
    sourcePath: 'vendor/taste-skill/skills/taste-skill/SKILL.md',
  },
];

export const AI_SKILLS: readonly AiSkill[] = SKILL_DEFINITIONS.map((skill) => ({
  ...skill,
  content: readSkillPackFile(skill.sourcePath),
}));

export const AI_SKILLS_BY_ID: ReadonlyMap<string, AiSkill> = new Map(
  AI_SKILLS.map((skill) => [skill.id, skill]),
);

export function getAiSkillById(id: string): AiSkill | undefined {
  return AI_SKILLS_BY_ID.get(id);
}

function readSkillPackFile(relativePath: string): string {
  const root = findWorkspaceRoot();
  const absolutePath = path.join(root, SKILLS_PACK_DIR, relativePath);

  return readFileSync(absolutePath, 'utf8').trim();
}

function findWorkspaceRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
  ];

  const root = candidates.find((candidate) =>
    existsSync(path.join(candidate, SKILLS_PACK_DIR, 'manifest.json')),
  );

  if (!root) {
    throw new Error(`Cannot find ${SKILLS_PACK_DIR}/manifest.json`);
  }

  return root;
}
