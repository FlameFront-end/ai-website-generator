# 00-global-product-rules.md

## Purpose

Global product rules for the visual-first AI website generator.

Use this file as shared context for all AI stages.

## Product

This product is a visual-first AI website generator.

It must not behave like a generic prompt-to-code website builder.

The core workflow is:

```text
brief → project spec → visual references → approved design → frontend code → screenshot QA → repair/export
```

## MVP Scope

MVP supports single-page landing pages.

Do not expand to multipage websites, ecommerce checkout, CMS, dashboards, mobile apps, deploy, GitHub integration, Figma export, or drag-and-drop editing unless explicitly enabled later.

## Visual-First Rule

The user should approve visual references before code generation.

For this project, visual references must be generated section by section:

```text
one section = one image
```

After section images exist, create one full-page preview from them.

## Required Visual Output

The image generation stage should produce:

```text
reference/blocks/01-hero.png
reference/blocks/02-benefits.png
reference/blocks/03-features.png
reference/blocks/04-how-it-works.png
reference/blocks/05-trust-or-pricing.png
reference/blocks/06-faq.png
reference/blocks/07-final-cta-footer.png
reference/full-page-preview.png
reference/blocks-manifest.json
```

Exact sections may change based on the brief.

## Design Quality

Avoid generic AI design:

- purple/blue AI glow clichés;
- random blobs;
- fake dashboard spam;
- weak typography;
- unreadable text;
- boring templates;
- browser chrome;
- device mockups unless requested.

Prefer:

- strong hierarchy;
- generous spacing;
- clear landing page UX;
- implementable layouts;
- premium restraint;
- readable typography;
- consistent section rhythm.

## Code Output

Default export stack:

```text
Next.js App Router
TypeScript
Tailwind CSS
React components
ZIP export
```

Code must be editable, responsive, buildable, and visually close to approved references.

## Source Priority For Code

Use sources in this order:

```text
1. approved block images
2. full-page preview
3. project spec
4. design tokens
5. design description / DESIGN.md
6. asset rules
7. original brief
```

Do not generate code from vague memory if approved references exist.
