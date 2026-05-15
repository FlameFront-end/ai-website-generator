import type { CodePlan, DesignTokens, ProjectSpec } from '../ai.types';
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
    ['product-global-rules', 'image-to-code', 'taste-output'],
    6000,
  ),
  `Generate shell/layout files for a Next.js App Router landing page.

If a full-page reference image is attached to the user message, use it to set the OVERALL composition: section ordering, vertical rhythm, page-level background and the global CSS variables in globals.css.

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
  fullPageImageDataUrl: string | null,
): ChatMessage[] {
  const userParts: ChatContentPart[] = [];

  if (fullPageImageDataUrl) {
    userParts.push({
      type: 'image_url',
      image_url: { url: fullPageImageDataUrl, detail: 'high' },
    });
    userParts.push({
      type: 'text',
      text: 'The image above is the approved full-page reference for the entire landing. Use it to anchor section ordering, page-level background and overall vertical rhythm.',
    });
  }

  userParts.push({
    type: 'text',
    text: `Brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nCodePlan:\n${JSON.stringify(codePlan, null, 2)}\n\nContent files:\n${contentFiles}\n\nCodegen context:\n${codegenContext}`,
  });

  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userParts },
  ];
}
