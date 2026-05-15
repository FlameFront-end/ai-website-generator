import type { CodePlan, DesignTokens, ProjectSpec } from '../ai.types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

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
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nCodegen context:\n${codegenContext}`,
    },
  ];
}

export type { CodePlan };
