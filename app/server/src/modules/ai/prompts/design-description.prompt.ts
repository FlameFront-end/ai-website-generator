import type { DesignTokens, ProjectSpec } from '../types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(
    [
      'product-global-rules',
      'design-system-assets',
      'image-generation-workflow',
      'taste-visual-quality',
    ],
    6500,
  ),
  `You are a senior UI/UX designer and art director.

Write a compact but concrete visual design description for the whole landing page. It will guide section-by-section reference image generation, so it must describe full-page rhythm and each section, not just the hero.

Return markdown only. Do not include code, JSX, CSS, Tailwind classes, markdown code fences, or developer handoff.

Required sections:
1. Design concept
2. Visual system
3. Full-page section rhythm
4. Navigation and hero
5. Section-by-section image direction
6. CTA, trust, metrics, proof
7. Token usage
8. Responsive behavior
9. Do not generate

Rules:
- Write the markdown in the target site language from the brief. If the brief says "Target site language: Russian", all headings and prose MUST be Russian Cyrillic.
- Keep internal reasoning in English if needed, but never output English user-facing markdown when the target site language is Russian.
- Technical token names, CSS values, color names, numbers, file-like identifiers and brand names may stay as-is.
- Use concrete token values: colors, gradients, sizes, radii, shadows, blur, breakpoints.
- For every spec section, describe goal, composition, key content, visual focus, background, cards/images/icons, spacing rhythm.
- Respect one section = one image. Each section description should be usable as an image prompt.
- Full-page preview must be composed from section images, not redesigned.
- Do not add entities that conflict with the brief.`,
);

export function buildDesignDescriptionMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
): ChatMessage[] {
  const targetLanguage = brief.includes('Target site language: Russian')
    ? 'Russian'
    : brief.includes('Target site language: English')
      ? 'English'
      : 'the language of the brief';

  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Original brief:\n${brief}\n\nTarget output language for this markdown: ${targetLanguage}.\nLanguage rule: write all user-facing design description headings and prose in ${targetLanguage}. Keep only technical values/brand names as-is.\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}`,
    },
  ];
}
