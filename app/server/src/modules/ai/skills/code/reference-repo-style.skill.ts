import type { AiSkill } from '../types';

export const referenceRepoStyleSkill: AiSkill = {
  id: 'reference-repo-style',
  title: 'Reference repository architecture style',
  kind: 'code',
  appliesTo: ['code'],
  priority: 90,
  tokenBudget: 420,
  triggers: ['reference', 'architecture', 'structure', 'next', 'component'],
  content:
    'Use the reference repository as an architecture quality standard: separate app routes, layout, components, content, config and lib. Do not copy it literally. Keep content/config data outside JSX where practical and keep components small, typed and composable.',
};
