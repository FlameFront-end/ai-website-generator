import type { AiSkill } from '../types';

export const tailwindQualitySkill: AiSkill = {
  id: 'tailwind-quality',
  title: 'Tailwind quality and constraints',
  kind: 'code',
  appliesTo: ['code', 'build'],
  priority: 88,
  tokenBudget: 420,
  triggers: ['tailwind', 'class', 'css', 'style', 'layout'],
  content:
    'Use valid Tailwind utility classes only. Semantic classes such as border-border, bg-background and text-foreground require matching theme tokens. Prefer responsive utilities, strong spacing rhythm and accessible contrast. Do not invent Tailwind classes.',
};
