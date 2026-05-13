# Какой skill куда подключать в текущем репозитории

## 0. Общие правила продукта

### Файл skill

```text
skills/product/00-global-product-rules.md
```

### Куда подключать

Подмешивать как общий system-context почти везде:

```text
app/server/src/modules/ai/prompts/clarify-brief.prompt.ts
app/server/src/modules/ai/prompts/extract-spec.prompt.ts
app/server/src/modules/ai/prompts/design-tokens.prompt.ts
app/server/src/modules/ai/prompts/design-description.prompt.ts
app/server/src/modules/ai/prompts/generate-code.prompt.ts
```

### Зачем

Чтобы модель всегда понимала:

```text
мы делаем visual-first generator;
MVP = landing pages;
один блок = одно изображение;
после блоков нужен full-page preview;
код должен соответствовать approved images.
```

---

## 1. Brief / Project Spec

### Файл skill

```text
skills/product/01-brief-and-structure.md
```

### Куда подключать

```text
clarify-brief.prompt.ts
extract-spec.prompt.ts
```

### Что менять

`clarify-brief.prompt.ts` уже хороший: он задаёт вопросы и ограничивает их. Его можно оставить, но добавить правила из skill.

`extract-spec.prompt.ts` сейчас слишком hero-focused. Его нужно переделать так, чтобы он возвращал структуру лендинга:

```text
projectType
idea
industry
audience
goal
language
stylePreference
sections[]
contentNotes
visualNotes
assumptions
```

---

## 2. Image generation workflow

### Файл skill

```text
skills/product/02-image-generation-workflow.md
```

### Open-source Taste Skill

```text
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
```

### Куда подключать

```text
design-description.prompt.ts
pipeline.service.ts → buildReferenceImagePrompt или новый buildSectionImagePrompt
images.service.ts → prompt перед generateImage(prompt)
```

### Что менять

Сейчас `pipeline.service.ts` генерирует один `reference/reference.ext`.

Нужно заменить/расширить на:

```text
reference/visual-directions/direction-a.png       optional
reference/visual-directions/direction-b.png       optional
reference/blocks/01-hero.png
reference/blocks/02-benefits.png
reference/blocks/03-features.png
reference/blocks/04-how-it-works.png
reference/blocks/05-trust-or-pricing.png
reference/blocks/06-faq.png
reference/blocks/07-final-cta-footer.png
reference/full-page-preview.png
```

### Самое важное

`imagegen-frontend-web/SKILL.md` — главный open-source skill для красивой генерации frontend images.

Но наш `02-image-generation-workflow.md` должен управлять продуктовой логикой:

```text
не один hero;
не одна общая картинка сразу;
сначала блоки;
потом full-page preview;
не редизайнить блоки при сборке preview.
```

---

## 3. Design system / assets

### Файл skill

```text
skills/product/03-design-system-assets.md
```

### Куда подключать

```text
design-tokens.prompt.ts
design-description.prompt.ts
generate-svg.prompt.ts
```

### Что менять

`design-tokens.prompt.ts` сейчас генерирует токены под hero section. Нужно сделать page-level tokens:

```text
colors
typography
layout
components
sections
responsive
assets
```

`generate-svg.prompt.ts` можно оставить как вспомогательный, но не считать SVG главным источником макета.

---

## 4. Image-to-code

### Файл skill

```text
skills/product/04-image-to-code.md
```

### Open-source Taste Skill

```text
vendor/taste-skill/skills/image-to-code-skill/SKILL.md
```

### Куда подключать

```text
generate-code.prompt.ts
code-generator.service.ts
```

### Что менять

`generate-code.prompt.ts` уже неплохой, но сейчас опирается на spec/tokens/designDescription, а не на approved block images.

Нужно добавить правила:

```text
use approved block images as primary visual references;
do not invent a new design;
do not rasterize whole sections;
use text/buttons/cards as code;
use assets only where appropriate;
match block references and full-page preview.
```

---

## 5. Build / QA / Repair / Export

### Файл skill

```text
skills/product/05-build-qa-repair-export.md
```

### Open-source Taste Skill optional

```text
vendor/taste-skill/skills/output-skill/SKILL.md
vendor/taste-skill/skills/redesign-skill/SKILL.md
vendor/taste-skill/skills/taste-skill/SKILL.md
```

### Куда подключать

```text
build.service.ts
screenshot.service.ts
visual-qa.service.ts
pipeline.service.ts
runs.service.ts export zip flow
```

### Что менять

`build.service.ts` уже есть.

`screenshot.service.ts` сейчас делает desktop/mobile first viewport. Желательно добавить fullPage screenshot позже.

`visual-qa.service.ts` сейчас сравнивает один reference image и один rendered-desktop.png. Для вашего workflow позже нужно сравнивать:

```text
reference/blocks/*.png vs rendered sections
или
reference/full-page-preview.png vs rendered full-page screenshot
```

Для MVP можно оставить текущее сравнение, но лучше поменять reference на `full-page-preview.png` или первый hero block.
