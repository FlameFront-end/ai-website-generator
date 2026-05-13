# 04-image-to-code.md

## Purpose

Rules for generating frontend code from approved visual references.

Use with:

```text
generate-code.prompt.ts
code-generator.service.ts
vendor/taste-skill/skills/image-to-code-skill/SKILL.md
```

## Core Rule

Approved block images are the main visual source of truth.

Use:

```text
reference/blocks/*.png
reference/full-page-preview.png
reference/blocks-manifest.json
ProjectSpec
DesignTokens
DesignDescription
```

## Do Not Restart Design

At code generation time, do not generate a new design.

Do not reinterpret the landing page into a generic template.

Do not ignore approved block images.

## Implementation Stack

Use the repository's current generated project stack:

```text
Next.js App Router
TypeScript
Tailwind CSS
React components
```

## Component Structure

Generate section components based on block references:

```text
src/components/landing/landing-page.tsx
src/components/landing/hero-section.tsx
src/components/landing/benefits-section.tsx
src/components/landing/features-section.tsx
src/components/landing/how-it-works-section.tsx
src/components/landing/trust-section.tsx
src/components/landing/faq-section.tsx
src/components/landing/final-cta-section.tsx
```

Exact names may adapt to ProjectSpec.sections.

## Asset Usage

Do not turn every section into a static image.

Build as code:

- text;
- buttons;
- layout;
- cards;
- nav;
- FAQ;
- stats;
- forms.

Use image assets only for complex visuals.

## Visual Matching

Prioritize:

- section order;
- typography hierarchy;
- spacing rhythm;
- color direction;
- CTA hierarchy;
- cards and UI style;
- asset position/scale;
- overall mood.

## Responsive

Generated code must be responsive by default.

If mobile references exist, follow them.

If not, infer professional responsive behavior.

## Hard Rules

- Return valid JSON if the existing prompt expects JSON.
- Do not include missing imports.
- Do not use TODO placeholders.
- Do not import dependencies that are not in package.json.
- Do not generate pages router or Vite code.
- Do not generate one huge monolithic page if sections exist.
