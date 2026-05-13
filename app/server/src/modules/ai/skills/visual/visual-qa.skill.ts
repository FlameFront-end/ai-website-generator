import type { AiSkill } from '../types';

export const visualQaSkill: AiSkill = {
  id: 'visual-qa',
  title: 'Visual QA',
  kind: 'visual',
  appliesTo: ['qa'],
  priority: 84,
  tokenBudget: 360,
  triggers: ['screenshot', 'visual', 'qa', 'contrast', 'spacing'],
  content:
    'Evaluate screenshots against the brief, design summary and reference context. Focus on hierarchy, contrast, spacing, responsiveness, CTA visibility, content completeness and avoiding generic AI-looking visuals.',
};
