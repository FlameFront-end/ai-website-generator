import type { AiSkill } from '../types';

export const designTokenDisciplineSkill: AiSkill = {
  id: 'design-token-discipline',
  title: 'Design token discipline',
  kind: 'design',
  appliesTo: ['design', 'code'],
  priority: 78,
  tokenBudget: 320,
  triggers: ['tokens', 'colors', 'typography', 'design'],
  content:
    'Treat design tokens as constraints for color, typography, spacing and component styling. Do not ignore tokens in generated code. If a visual choice needs variation, derive it from the existing palette.',
};
