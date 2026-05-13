import type { AiSkill } from '../types';

export const nextAppRouterSkill: AiSkill = {
  id: 'next-app-router',
  title: 'Next.js App Router conventions',
  kind: 'code',
  appliesTo: ['code', 'build'],
  priority: 95,
  tokenBudget: 360,
  triggers: ['next', 'app router', 'page.tsx', 'layout.tsx', 'metadata'],
  content:
    'Generate code for Next.js App Router. Keep route files under src/app, use src/app/page.tsx as the landing entrypoint, put global CSS in src/app/globals.css, and export metadata from layout when needed. Avoid Pages Router APIs.',
};
