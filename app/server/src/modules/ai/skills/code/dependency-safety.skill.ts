import type { AiSkill } from '../types';

export const dependencySafetySkill: AiSkill = {
  id: 'dependency-safety',
  title: 'Dependency safety',
  kind: 'code',
  appliesTo: ['code', 'build'],
  priority: 82,
  tokenBudget: 280,
  triggers: ['dependency', 'import', 'package', 'module not found'],
  content:
    'Only import packages that exist in package.json or are built into Next.js, React or TypeScript. Prefer local utilities for simple helpers. If an external package is necessary, it must be listed as a dependency.',
};
