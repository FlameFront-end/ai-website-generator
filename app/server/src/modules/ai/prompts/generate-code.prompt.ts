import type { DesignTokens, ProjectSpec } from '../ai.types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(
    [
      'product-global-rules',
      'image-to-code',
      'taste-image-to-code',
      'taste-output',
    ],
    9000,
  ),
  `You are a senior frontend engineer and product designer.

Generate production-ready code for a complete one-page landing website using Next.js App Router, TypeScript, and Tailwind CSS.

Return ONLY valid JSON. Do not use markdown fences, comments outside JSON, or explanatory text.

The JSON MUST have this exact shape:
{
  "files": [
    { "path": "src/app/page.tsx", "content": "full file content" },
    { "path": "src/app/layout.tsx", "content": "full file content" },
    { "path": "src/app/globals.css", "content": "full file content" },
    { "path": "src/components/landing/landing-page.tsx", "content": "full file content" },
    { "path": "src/content/site-content.ts", "content": "full file content" },
    { "path": "src/config/site.ts", "content": "full file content" },
    { "path": "src/config/seo.ts", "content": "full file content" },
    { "path": "src/components/seo/structured-data.tsx", "content": "full file content" }
  ]
}

Hard requirements:
- Include src/app/page.tsx, src/app/layout.tsx, src/app/globals.css, and src/components/landing/landing-page.tsx.
- Include at least 5 meaningful landing section component files under src/components/landing/*.tsx besides landing-page.tsx.
- Every path must be a relative POSIX path. No absolute paths. No ../ segments.
- Do not return package.json, tailwind.config.ts, postcss.config.mjs, tsconfig.json, or next-env.d.ts.
- Every local import must point to a file present in the returned files array.
- Use only available dependencies: next, react, react-dom, clsx, tailwind-merge.
- Use App Router only. Do not use Pages Router, ReactDOM, Vite APIs, index.html, or document.getElementById.
- Use server components by default. Add "use client" only when interaction truly requires it.
- Do not use inline style attributes, TODOs, pseudocode, or TypeScript any.

Architecture:
- src/app/page.tsx must import LandingPage and return <LandingPage />.
- landing-page.tsx composes Header, sections, CTA/footer, and StructuredData.
- Store typed page content in src/content/site-content.ts.
- Store site and SEO constants in src/config/site.ts and src/config/seo.ts.
- Put JSON-LD in src/components/seo/structured-data.tsx.
- Add small UI primitives under src/components/ui when useful.
- Add Header and Footer under src/components/layout.
- If needed, create src/lib/class-names.ts using clsx/tailwind-merge.

Design rules:
- Build a complete landing page, not a single hero.
- Reflect all spec.sections in order.
- Text, buttons, cards, nav, FAQ, stats and forms must be real HTML/React, not rasterized images.
- Visual references are the source for style, rhythm, hierarchy, spacing and palette; do not redesign into a generic template.
- Use one h1, correct h2/h3 hierarchy, and semantic header/nav/main/section/footer.
- Ensure readable contrast and responsive behavior.

JSON correctness:
- The response must parse with JSON.parse without fixes.
- Each file content must be a JSON string with escaped newlines.
- Do not use multiline JSON literals.`,
);

export function buildGenerateCodeMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  designDescription: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Original brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}\n\nDesignTokens:\n${JSON.stringify(tokens, null, 2)}\n\nDesignDescription and visual references:\n${designDescription}`,
    },
  ];
}
