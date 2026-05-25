import type {
  CodePlan,
  CodePlanSection,
  DesignTokens,
  ProjectSpec,
} from '../types';
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
    ? `\n\nCode quality reference repository: ${url.trim()}\nMatch its component quality, naming, composition, imports and production structure while following THIS block image visually.`
    : '';
}

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['product-global-rules', 'image-to-code', 'taste-image-to-code'],
    6000,
  ),
  `Generate React component files for ONE landing section plus any local shared UI it needs.

Exactly one section/block is generated per request. If a reference image is attached, treat it as the AUTHORITATIVE visual source for this section only: layout, hierarchy, spacing, palette, typography weights, components, copy placement and decorative elements all come from this block image. Never infer layout from a full-page screenshot.

Return ONLY valid JSON:
{
  "files": [
    { "path": "src/components/landing/hero-section.tsx", "content": "full file content" }
  ]
}

Rules:
- Generate the requested section component plus any necessary local shared components it imports.
- Use semantic HTML and Tailwind utility classes.
- Text/cards/buttons/icons are real React/HTML, never rasterized images. Decorative shapes can be SVG inline.
- Match palette, radii, button height and card shadow from DesignTokens exactly.
- No missing local imports, no TODOs, no TypeScript any.`,
);

export function buildGenerateSectionMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  codePlan: CodePlan,
  section: CodePlanSection,
  contentFiles: string,
  codegenContext: string,
  sectionImageDataUrl: string | null,
  codeQualityReferenceUrl: string,
): ChatMessage[] {
  const userParts: ChatContentPart[] = [];

  if (sectionImageDataUrl) {
    userParts.push({
      type: 'image_url',
      image_url: { url: sectionImageDataUrl, detail: 'high' },
    });
    userParts.push({
      type: 'text',
      text: 'The image above is the approved visual reference for THIS block only. Reproduce this block faithfully and do not use any full-page image context.',
    });
  }

  userParts.push({
    type: 'text',
    text: `Brief:\n${brief}\n\nProjectSpec:${compactJson(spec)}\n\nDesignTokens:${compactJson(tokens)}\n\nCodePlan:${compactJson(codePlan)}\n\nTarget section:${compactJson(section)}\n\nContent files:${contentFiles}\n\nCodegen context:\n${codegenContext}${qualityReference(codeQualityReferenceUrl)}`,
  });

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userParts },
  ];
}
