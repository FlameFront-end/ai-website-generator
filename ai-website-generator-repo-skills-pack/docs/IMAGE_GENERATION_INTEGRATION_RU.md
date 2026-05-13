# Где именно начинается генерация изображений

Это самый важный документ для вашего проекта.

## Сейчас в репозитории

Сейчас image generation завязана на:

```text
app/server/src/modules/images/images.service.ts
app/server/src/modules/pipeline/pipeline.service.ts
```

`ImagesService.generateImage(prompt)` уже умеет отправлять prompt в Replicate.

В `PipelineService` есть метод:

```text
prepareReferenceImage(...)
```

и внутри:

```text
generateFluxReferenceImage(...)
buildReferenceImagePrompt(...)
```

Сейчас `buildReferenceImagePrompt` просит:

```text
Generate a polished visual reference mockup for the first viewport of a website hero section.
```

Это нужно заменить, потому что у нас workflow не hero-only.

---

# Правильный workflow для MVP

## 1. После spec/design tokens/design description

Вместо одного reference image нужно создать section list:

```text
hero
benefits
features
how-it-works
trust-or-pricing
faq
final-cta-footer
```

Эти секции должны приходить из `ProjectSpec.sections`.

---

## 2. Генерация каждого блока

Для каждого блока вызвать:

```text
imagesService.generateImage(sectionPrompt)
```

Где `sectionPrompt` собирается из:

```text
00-global-product-rules.md
02-image-generation-workflow.md
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
ProjectSpec
DesignTokens
DesignDescription
current section
previous section summaries
```

Сохранять так:

```text
reference/blocks/01-hero.png
reference/blocks/02-benefits.png
reference/blocks/03-features.png
...
```

---

## 3. Генерация full-page preview

Для MVP лучше не генерировать её отдельной AI-картинкой.

Лучше сделать скриптом:

```text
прочитать reference/blocks/*.png
отсортировать по order
нормализовать ширину до 1440
склеить вертикально
сохранить reference/full-page-preview.png
```

Так мы не рискуем, что AI поменяет дизайн блоков.

---

## 4. Optional visual directions

Идеальная версия:

```text
создать 2–3 visual direction hero concepts
пользователь выбирает стиль
после этого генерируются блоки
```

Но если сейчас нужно быстрее тестить MVP, можно временно пропустить visual directions:

```text
brief → structure → generate blocks directly
```

Тогда style задаётся из brief/design-tokens.

---

## 5. Где хранить манифест

Добавить файл:

```text
reference/blocks-manifest.json
```

Пример:

```json
{
  "blocks": [
    {
      "id": "hero",
      "order": 1,
      "title": "Hero",
      "imagePath": "reference/blocks/01-hero.png",
      "status": "generated"
    }
  ],
  "fullPagePreview": "reference/full-page-preview.png"
}
```

---

## 6. Что делать с ArtifactType

Сейчас есть:

```text
ReferenceImage
```

Для быстрого MVP можно сохранить все block images как `ReferenceImage`, потому что таблица допускает несколько артефактов одного типа.

Но лучше добавить новые типы:

```text
VisualDirectionImage
BlockReferenceImage
FullPagePreview
MobileReferenceImage
BlocksManifest
```

Это упростит UI и QA.

---

## 7. Какой skill обязателен

Для генерации desktop web images обязателен:

```text
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
```

Для mobile previews опционально:

```text
vendor/taste-skill/skills/imagegen-frontend-mobile/SKILL.md
```

При этом `imagegen-frontend-mobile` нужно использовать осторожно: он больше про mobile screens, а нам нужны responsive website sections.
