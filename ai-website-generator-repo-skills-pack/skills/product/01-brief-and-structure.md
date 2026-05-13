# 01-brief-and-structure.md

## Purpose

Rules for clarifying the user brief and extracting a full landing page structure.

Use with:

```text
clarify-brief.prompt.ts
extract-spec.prompt.ts
```

## Briefing Goal

Collect enough information to generate a strong landing page, not just a hero section.

The system should understand:

- product/business idea;
- target audience;
- main conversion goal;
- language;
- visual style;
- required sections;
- references/assets;
- constraints and things to avoid.

## Clarification Rules

Ask one useful question at a time when the brief is unclear.

Do not ask about budget, deadline, development cost, or business logistics.

Maximum default questions: 5.

If the user does not know, make a reasonable assumption and continue.

## Project Spec Must Be Page-Level

`extract-spec.prompt.ts` must not extract only a hero section.

It should produce a page-level spec with sections.

Required structure:

```json
{
  "projectType": "landing_page",
  "productName": "",
  "productDescription": "",
  "industry": "",
  "audience": "",
  "goal": "",
  "language": "English",
  "style": [],
  "visualPreferences": [],
  "avoid": [],
  "copy": {
    "headline": "",
    "description": "",
    "primaryButton": "",
    "secondaryButton": ""
  },
  "navigation": {
    "logo": "",
    "menuItems": [],
    "ctaButton": ""
  },
  "sections": [
    {
      "id": "hero",
      "order": 1,
      "title": "Hero",
      "goal": "",
      "contentNotes": "",
      "visualNotes": "",
      "requiredElements": []
    }
  ],
  "assumptions": []
}
```

## Default Sections

If sections are not provided, use 5–7 sections:

```text
hero
benefits
features
how-it-works
trust-or-pricing
faq
final-cta-footer
```

Adapt to the niche.

## Hard Rule

Do not let the spec stay hero-only.

Hero is only the first section.
