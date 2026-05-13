import type { AiSkill } from '../types';

export const componentArchitectureSkill: AiSkill = {
  id: 'component-architecture',
  title: 'Component architecture',
  kind: 'code',
  appliesTo: ['code'],
  priority: 85,
  tokenBudget: 420,
  triggers: ['component', 'tsx', 'landing', 'sections', 'architecture'],
  content:
    'Split the landing page into clear components: page shell, hero, reusable section blocks, cards, CTA and footer. Components should receive typed data or import typed content modules instead of hardcoding all copy in JSX.',
};
