# 02-image-generation-workflow.md

## Purpose

Rules for image generation in the current repository.

Use with:

```text
design-description.prompt.ts
pipeline.service.ts / buildReferenceImagePrompt or buildSectionImagePrompt
images.service.ts before generateImage(prompt)
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
```

## Core Rule

Generate website visuals section by section.

```text
one section = one image
```

Do not generate only one hero reference image.

Do not generate the entire landing page as one AI image at the first step.

## Required Output

For each section in `ProjectSpec.sections`, generate one image:

```text
reference/blocks/01-hero.png
reference/blocks/02-benefits.png
reference/blocks/03-features.png
reference/blocks/04-how-it-works.png
reference/blocks/05-trust-or-pricing.png
reference/blocks/06-faq.png
reference/blocks/07-final-cta-footer.png
```

Then create:

```text
reference/full-page-preview.png
reference/blocks-manifest.json
```

## Open-Source Skill Dependency

Use:

```text
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
```

It provides the visual art direction layer.

This product skill controls the product workflow.

## Section Image Prompt Must Include

Each section prompt must include:

- original brief;
- ProjectSpec;
- DesignTokens;
- DesignDescription;
- current section object;
- style and constraints;
- previous section summaries if available;
- instruction to generate only this section;
- instruction to avoid browser chrome and device frames.

## Prompt Pattern

```text
Create one production-ready desktop website section image.

Project: [productName / idea]
Audience: [audience]
Goal: [goal]
Language: [language]
Style: [style summary]
Avoid: [avoid rules]

Current section:
ID: [section.id]
Title: [section.title]
Goal: [section.goal]
Content notes: [section.contentNotes]
Visual notes: [section.visualNotes]
Required elements: [section.requiredElements]

Canvas: 1440px wide desktop website section.
View: straight-on website screenshot.
Do not include browser chrome.
Do not include device mockups.
Do not create the full page.
Create only this section.

The result must feel like a real shipped landing page section with strong typography, clear hierarchy, generous spacing, readable text, coherent style, and frontend-implementable layout.
```

## Full-Page Preview Rule

For MVP, create `reference/full-page-preview.png` by vertically stitching the generated block images.

Do not use AI to redesign the full page.

The full-page preview must preserve:

- section order;
- section content;
- approved block designs;
- selected style;
- spacing rhythm as much as possible.

## Visual Directions Optional

Ideal flow:

```text
2–3 visual directions → user chooses → generate all blocks
```

Fast MVP flow:

```text
brief → structure → generate all blocks directly
```

If visual directions are skipped, use ProjectSpec + DesignTokens as the style source.

## Mobile Preview Optional

If mobile previews are enabled, use:

```text
vendor/taste-skill/skills/imagegen-frontend-mobile/SKILL.md
```

But adapt it for mobile website sections, not native mobile app screens.

## Hard Rules

- Do not generate only a hero image.
- Do not skip section images.
- Do not create browser chrome.
- Do not create device mockups unless requested.
- Do not allow each block to become a different style.
- Do not use the full-page preview as the only source for code.
