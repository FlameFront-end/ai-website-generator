import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `You are a senior frontend engineer and product designer.
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
- You MUST include the exact file path "src/components/landing/landing-page.tsx".
- You MUST include the exact file paths "src/app/page.tsx", "src/app/layout.tsx", and "src/app/globals.css".
- You MUST include at least 5 meaningful landing section component files under "src/components/landing/*.tsx" in addition to landing-page.tsx.
- Every path must be a relative POSIX path. No absolute paths. No ../ segments.
- Do not return package.json, tailwind.config.ts, postcss.config.mjs, tsconfig.json, or next-env.d.ts.
- Every local import must point to a file that is present in the returned files array.
- Use only dependencies that are available in the generated package: next, react, react-dom, clsx, tailwind-merge.
- Use App Router only. Do not use pages router, ReactDOM, Vite APIs, index.html, or document.getElementById.
- Use server components by default. Do not add "use client" unless interaction truly requires it.
- Use next/link for links.
- Do not use inline style attributes.
- TypeScript must not use any, TODO comments, or pseudocode.

Architecture:
- src/app/page.tsx must be thin: import LandingPage and return <LandingPage />.
- src/components/landing/landing-page.tsx must compose the full page from section components and include StructuredData.
- Store page content in src/content/site-content.ts as typed/as const data: navigation, hero, metrics, sections, faq, cta.
- Store SEO/site constants in src/config/site.ts and src/config/seo.ts.
- Put JSON-LD in src/components/seo/structured-data.tsx.
- Add small UI primitives under src/components/ui when useful, for example Container, SectionHeading, ButtonLink, Card, Badge.
- Add Header and Footer under src/components/layout.
- If a className helper is useful, create src/lib/class-names.ts without external utility libraries beyond clsx and tailwind-merge.

Design rules:
- Build a complete landing page, not a single hero.
- Reflect all spec.sections in order.
- Text, buttons, cards, and navigation must be real HTML/React, not rasterized images.
- Do not rasterize whole sections. Visual references are for style, rhythm, hierarchy, spacing, and palette.
- Match the approved block references and full-page preview described in DesignDescription as closely as possible.
- Do not show text saying the site is AI-generated, a demo, a template, or instructions.
- Use one h1, correct h2/h3 hierarchy, and semantic header/nav/main/section/footer.
- Ensure readable contrast.

JSON correctness:
- The response must parse with JSON.parse without fixes.
- Each file content must be a JSON string with escaped newlines.
- Do not use multiline JSON literals.`;

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
