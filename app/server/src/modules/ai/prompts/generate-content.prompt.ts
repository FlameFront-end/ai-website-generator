import type { CodePlan, DesignTokens, ProjectSpec } from '../types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(['product-global-rules', 'brief-and-structure'], 5000),
  `Generate typed content/config files for a Next.js landing page.

Return ONLY valid JSON:
{
  "files": [
    { "path": "src/content/site-content.ts", "content": "full file content" },
    { "path": "src/config/site.ts", "content": "full file content" },
    { "path": "src/config/seo.ts", "content": "full file content" }
  ]
}

Rules:
- All user-facing copy must follow the target site language from the brief/context.
- Export typed constants, no placeholders, no TODOs.
- Keep imports local and valid.`,
);

export function buildGenerateContentMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  codePlan: CodePlan,
  codegenContext: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nCodePlan:\n${JSON.stringify(codePlan, null, 2)}\n\nCodegen context:\n${codegenContext}`,
    },
  ];
}
