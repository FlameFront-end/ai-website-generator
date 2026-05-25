import type { CodePlan, DesignTokens, ProjectSpec } from '../types';
import type {
  ChatContentPart,
  ChatMessage,
} from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

function qualityReference(url: string): string {
  return url.trim()
    ? `\n\nCode quality reference repository: ${url.trim()}\nMatch its layout structure, imports, naming and production quality.`
    : '';
}

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['product-global-rules', 'image-to-code', 'taste-output'],
    6000,
  ),
  `Generate shell/layout files for a Next.js App Router landing page.

Do not depend on a full-page screenshot. The landing is assembled from section components generated separately from per-block reference images.

Return ONLY valid JSON:
{
  "files": [
    { "path": "src/app/page.tsx", "content": "full file content" },
    { "path": "src/app/layout.tsx", "content": "full file content" },
    { "path": "src/app/globals.css", "content": "full file content" },
    { "path": "src/components/landing/landing-page.tsx", "content": "full file content" }
  ]
}

Rules:
- page.tsx imports LandingPage and returns it.
- layout.tsx imports globals.css and metadata from config/seo.
- landing-page.tsx composes generated sections in CodePlan order.
- globals.css defines Tailwind directives and design-token CSS variables.
- No missing local imports.`,
);

export function buildGenerateLayoutMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  codePlan: CodePlan,
  contentFiles: string,
  codegenContext: string,
  codeQualityReferenceUrl: string,
): ChatMessage[] {
  const userParts: ChatContentPart[] = [];

  userParts.push({
    type: 'text',
    text: `Brief:\n${brief}\n\nProjectSpec:${compactJson(spec)}\n\nDesignTokens:${compactJson(tokens)}\n\nCodePlan:${compactJson(codePlan)}\n\nContent files:${contentFiles}\n\nCodegen context:\n${codegenContext}${qualityReference(codeQualityReferenceUrl)}`,
  });

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userParts },
  ];
}
