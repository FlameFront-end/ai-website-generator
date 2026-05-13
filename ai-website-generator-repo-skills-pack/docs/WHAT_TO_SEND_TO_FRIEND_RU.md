# Коротко для друга

Сейчас у нас есть рабочий каркас, но он больше заточен под генерацию одного hero/reference. Нам нужно перевести его на visual-first block workflow.

## Главная логика продукта

```text
пользовательский бриф
→ уточнение брифа
→ project spec с sections[]
→ генерация изображений по блокам
→ full-page preview из этих блоков
→ генерация Next.js/Tailwind кода
→ build
→ screenshots
→ visual QA
→ repair/export
```

## Сколько MD-файлов реально нужно сейчас

Не 22. Для MVP достаточно 6:

```text
00-global-product-rules.md
01-brief-and-structure.md
02-image-generation-workflow.md
03-design-system-assets.md
04-image-to-code.md
05-build-qa-repair-export.md
```

## Самый важный файл для image generation

```text
02-image-generation-workflow.md
```

Он должен подключаться к месту, где собирается prompt для Replicate/image model.

## Обязательный open-source skill

```text
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
```

Он даёт качество дизайна, anti-slop и правила frontend image direction.

## Где в коде менять

Главное место:

```text
app/server/src/modules/pipeline/pipeline.service.ts
```

Сейчас там есть:

```text
prepareReferenceImage
generateFluxReferenceImage
buildReferenceImagePrompt
```

Нужно заменить один reference на много block references.

## Что генерировать

```text
reference/blocks/01-hero.png
reference/blocks/02-benefits.png
reference/blocks/03-features.png
reference/blocks/04-how-it-works.png
reference/blocks/05-trust-or-pricing.png
reference/blocks/06-faq.png
reference/blocks/07-final-cta-footer.png
reference/full-page-preview.png
```

## Быстрый MVP без усложнения

Можно пока не делать 2–3 visual direction options.

Первый тест:

```text
brief → sections → generate blocks → stitch full preview → code
```

А выбор visual direction добавить позже.

## Главное отличие от текущего каркаса

Сейчас:

```text
one hero reference image
```

Нужно:

```text
one image per section + full-page preview
```
