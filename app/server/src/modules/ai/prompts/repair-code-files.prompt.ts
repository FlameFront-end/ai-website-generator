import type { DesignTokens, GeneratedFile, ProjectSpec } from '../types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['product-global-rules', 'image-to-code', 'taste-output'],
    5000,
  ),
  `Repair a broken set of generated Next.js App Router UI files.

Return ONLY valid JSON:
{
  "files": [
    { "path": "src/app/page.tsx", "content": "full repaired file content" }
  ]
}

Rules:
- Return the complete repaired UI file set, not patches.
- Keep the existing design direction, content intent, section order and user-facing language.
- Fix the validation error exactly.
- Include all required files: src/app/page.tsx, src/app/layout.tsx, src/app/globals.css, src/components/landing/landing-page.tsx.
- Use only .ts, .tsx, .css UI files under src/.
- Do not return package.json, configs, README, next-env.d.ts, empty files, absolute paths or parent-directory imports.
- Ensure every local import resolves to a returned file.`,
);

export function buildRepairCodeFilesMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  validationError: string,
  files: GeneratedFile[],
  codegenContext: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nValidation error:\n${validationError}\n\nBroken files:\n${JSON.stringify(files, null, 2)}\n\nCodegen context:\n${codegenContext}`,
    },
  ];
}
