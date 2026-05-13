# 05-build-qa-repair-export.md

## Purpose

Rules for build, screenshot QA, visual repair, and export.

Use with:

```text
build.service.ts
screenshot.service.ts
visual-qa.service.ts
pipeline.service.ts
runs.service.ts
vendor/taste-skill/skills/output-skill/SKILL.md
vendor/taste-skill/skills/redesign-skill/SKILL.md
vendor/taste-skill/skills/taste-skill/SKILL.md
```

## Build Rules

The generated project must pass:

```text
npm install --include=dev
npm run build
```

Fix broken imports, missing files, TypeScript errors, JSX errors, Tailwind errors, and asset path errors.

Do not redesign the page during build fixing.

## Screenshot Rules

Current repository captures:

```text
rendered-desktop.png
rendered-mobile.png
```

Recommended future change:

- add fullPage desktop screenshot;
- add tablet screenshot;
- later add section-level screenshots.

## Visual QA Rules

Current `visual-qa.service.ts` compares one reference image with one desktop screenshot.

For the new workflow, compare either:

```text
reference/full-page-preview.png vs rendered full-page screenshot
```

or later:

```text
reference/blocks/*.png vs rendered section screenshots
```

## Repair Rules

Visual repair must not redesign the site.

It should only fix differences from visual QA:

- spacing;
- typography;
- colors;
- section height;
- layout;
- CTA position;
- asset scale;
- responsive issues.

## Export Rules

Final ZIP should include generated code and README.

Do not include:

- node_modules;
- .env;
- internal prompts;
- private keys;
- temporary logs.

## Optional Open-Source Skills

Use `output-skill` when model outputs incomplete code.

Use `redesign-skill` and `taste-skill` for visual repair and frontend polish.
