import type { DesignTokens, ProjectSpec } from '../types';
import type { GeneratedCodeFile } from '../ai.service';
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
  `Repair one module from a split Next.js UI code generation result.

Return ONLY valid JSON:
{
  "files": [
    { "path": "src/components/landing/hero-section.tsx", "content": "full repaired file content" }
  ]
}

Rules:
- Return only files belonging to the target module.
- Return complete file contents, not patches.
- Keep existing user-facing language, copy intent, visual style and section order.
- Fix the validation error exactly.
- Do not modify scaffold files.
- Use only .ts, .tsx, .css UI files under src/.
- Do not use empty files, absolute paths, parent-directory imports or unresolved local imports.
- If a local import is needed by the repaired module, include that imported file in the returned module files.`,
);

export function buildRepairCodeModuleMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  targetModule: string,
  validationError: string,
  moduleFiles: GeneratedCodeFile[],
  contextFiles: GeneratedCodeFile[],
  codegenContext: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nTarget module:\n${targetModule}\n\nValidation error:\n${validationError}\n\nModule files to repair:\n${JSON.stringify(moduleFiles, null, 2)}\n\nOther generated files for context, do not rewrite unless imported by target module:\n${JSON.stringify(contextFiles, null, 2)}\n\nCodegen context:\n${codegenContext}`,
    },
  ];
}
