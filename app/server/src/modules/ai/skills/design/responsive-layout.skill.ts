import type { AiSkill } from '../types';

export const responsiveLayoutSkill: AiSkill = {
  id: 'responsive-layout',
  title: 'Responsive layout',
  kind: 'design',
  appliesTo: ['design', 'code', 'qa'],
  priority: 80,
  tokenBudget: 320,
  triggers: ['responsive', 'mobile', 'tablet', 'desktop', 'overflow'],
  content:
    'Design and implement mobile-first responsive layouts. Avoid horizontal overflow, keep CTAs reachable on mobile, reduce dense grids to one column on small screens, and preserve hierarchy across breakpoints.',
};
