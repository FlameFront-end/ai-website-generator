# 03-design-system-assets.md

## Purpose

Rules for design tokens, design description, SVG generation, and asset planning.

Use with:

```text
design-tokens.prompt.ts
design-description.prompt.ts
generate-svg.prompt.ts
```

## Page-Level Design Tokens

Design tokens must describe the full landing page, not only the hero section.

Generate tokens for:

- colors;
- typography;
- layout;
- section spacing;
- components;
- responsive behavior;
- image treatment;
- assets.

## Design Description

Design description should describe:

- global design direction;
- section rhythm;
- each major section;
- full-page vertical flow;
- responsive behavior;
- how images/assets are used.

It should not only describe hero.

## Asset Rules

Text, buttons, cards, navigation, FAQ rows, forms, and layout must be implemented as code.

Use image assets only for:

- photos;
- complex illustrations;
- product mockups;
- textures;
- complex generated visuals.

Use SVG for:

- simple icons;
- arrows;
- checkmarks;
- simple logos/marks;
- simple geometric decorations.

Do not rasterize the whole website.

## SVG Reference Rule

`generate-svg.prompt.ts` can create simplified visual/SVG references, but it should not be the main website implementation.

SVG generation is optional and mainly useful for:

- simple icons;
- logo-like marks;
- vector decorations;
- simplified reference previews.

## DESIGN.md / Handoff

If generating a design description file, include practical implementation guidance:

- colors;
- typography;
- spacing;
- layout;
- sections;
- components;
- assets;
- responsive behavior;
- do/don't rules.
