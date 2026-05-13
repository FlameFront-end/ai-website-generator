import type { AiSkill } from '../types';

export const seoMetadataSkill: AiSkill = {
  id: 'seo-metadata',
  title: 'SEO metadata',
  kind: 'seo',
  appliesTo: ['code'],
  priority: 62,
  tokenBudget: 240,
  triggers: ['seo', 'metadata', 'open graph', 'title', 'description'],
  content:
    'Create concise SEO metadata from the project spec: title, description, Open Graph basics and robots. Keep metadata typed with Next.js Metadata and avoid fake URLs unless no real URL is available.',
};
