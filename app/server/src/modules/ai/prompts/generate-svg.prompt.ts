import type { DesignTokens, ProjectSpec } from '../types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['design-system-assets', 'image-generation-workflow'],
    4000,
  ),
  `You are a design illustrator creating a supporting SVG reference for one website section.

SVG is a helper artifact, not the main layout source. The visual-first workflow uses section images as primary references.

Return ONLY valid SVG code starting with <svg and ending with </svg>. No markdown.

Requirements:
- Use width="1440" height="900" viewBox="0 0 1440 900".
- Show one high-quality desktop website section, not the full site.
- Do not draw browser chrome or device frames.
- Use real copy from ProjectSpec.
- Reflect section rhythm, colors and components from DesignTokens.
- Avoid random blobs and generic AI glow unless requested.
- Text elements must be readable and must not overlap.`,
);

export function buildGenerateSvgMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  designDescription: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Original brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nDesignDescription:\n${designDescription}`,
    },
  ];
}
