import type { CodePlan, DesignTokens, ProjectSpec } from '../types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

function qualityReference(url: string): string {
  return url.trim()
    ? `\n\nCode quality reference repository: ${url.trim()}\nMatch its code quality, component boundaries, naming, file organization and production discipline. Do not copy product content unless explicitly present in the brief.`
    : '';
}

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['product-global-rules', 'image-to-code', 'taste-output'],
    6000,
  ),
  `Plan a production Next.js App Router + Tailwind landing page.

Return ONLY valid JSON matching CodePlan:
{
  "architecture": "short architecture summary",
  "files": ["relative/path.tsx"],
  "sections": [{ "id": "section-id", "componentName": "HeroSection", "filePath": "src/components/landing/hero-section.tsx", "purpose": "what it does" }],
  "sharedComponents": ["Header", "Footer", "Container"]
}

Rules:
- Include src/app/page.tsx, src/app/layout.tsx, src/app/globals.css, src/components/landing/landing-page.tsx.
- Include src/content/site-content.ts, src/config/site.ts, src/config/seo.ts, src/components/seo/structured-data.tsx.
- Reflect every ProjectSpec section in order.
- Use relative POSIX paths only.`,
);

export function buildCodePlanMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  codegenContext: string,
  codeQualityReferenceUrl: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Brief:\n${brief}\n\nProjectSpec:${compactJson(spec)}\n\nDesignTokens:${compactJson(tokens)}\n\nCodegen context:\n${codegenContext}${qualityReference(codeQualityReferenceUrl)}`,
    },
  ];
}

export type { CodePlan };
