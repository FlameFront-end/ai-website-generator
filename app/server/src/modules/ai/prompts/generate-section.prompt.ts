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

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['product-global-rules', 'image-to-code', 'taste-image-to-code'],
    6000,
  ),
  `Generate React component files for ONE landing section plus any local shared UI it needs.

If a reference image is attached to the user message, treat it as the AUTHORITATIVE visual source for this section: layout, hierarchy, spacing, palette, typography weights, components, copy placement and decorative elements all come from the image. Text descriptions and tokens are secondary clarification.

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
): ChatMessage[] {
  const userParts: ChatContentPart[] = [];

  if (sectionImageDataUrl) {
    userParts.push({
      type: 'image_url',
      image_url: { url: sectionImageDataUrl, detail: 'high' },
    });
    userParts.push({
      type: 'text',
      text: 'The image above is the approved visual reference for THIS section. Reproduce it faithfully.',
    });
  }

  userParts.push({
    type: 'text',
    text: `Brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nCodePlan:\n${JSON.stringify(codePlan, null, 2)}\n\nTarget section:\n${JSON.stringify(section, null, 2)}\n\nContent files:\n${contentFiles}\n\nCodegen context:\n${codegenContext}`,
  });

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userParts },
  ];
}
