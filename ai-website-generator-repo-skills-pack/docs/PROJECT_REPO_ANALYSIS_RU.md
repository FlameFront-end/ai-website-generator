# Анализ текущего репозитория

## Что уже есть

По архиву видно, что проект уже не пустой. Есть frontend + backend:

```text
app/client/...
app/server/...
```

Ключевые backend-файлы:

```text
app/server/src/modules/ai/prompts/clarify-brief.prompt.ts
app/server/src/modules/ai/prompts/extract-spec.prompt.ts
app/server/src/modules/ai/prompts/design-tokens.prompt.ts
app/server/src/modules/ai/prompts/design-description.prompt.ts
app/server/src/modules/ai/prompts/generate-code.prompt.ts
app/server/src/modules/ai/prompts/generate-svg.prompt.ts

app/server/src/modules/images/images.service.ts
app/server/src/modules/pipeline/pipeline.service.ts
app/server/src/modules/code-generator/code-generator.service.ts
app/server/src/modules/pipeline/build.service.ts
app/server/src/modules/pipeline/screenshot.service.ts
app/server/src/modules/pipeline/visual-qa.service.ts
```

## Главная проблема текущего каркаса

Сейчас пайплайн больше заточен под:

```text
brief → hero spec → design tokens → hero design description → one reference image → code
```

Это видно по формулировкам в текущих промптах:

- `extract-spec.prompt.ts` извлекает спецификацию первого экрана / hero section.
- `design-tokens.prompt.ts` генерирует токены для premium SaaS hero section.
- `design-description.prompt.ts` описывает hero section.
- `pipeline.service.ts` создаёт один `reference/reference.ext`.
- `visual-qa.service.ts` сравнивает один reference image с одним desktop screenshot 1440×900.

А наш продуктовый workflow другой:

```text
brief → landing structure → visual direction → one image per block → full-page preview → code
```

## Что нужно поменять в мышлении системы

Не надо удалять текущий каркас. Его нужно расширить:

1. `ProjectSpec` должен описывать не только hero, а всю landing page structure.
2. Reference image должен стать не одним файлом, а набором block references.
3. Full-page preview должен собираться из block references.
4. Code generation должен использовать block images + full-page preview + design docs.
5. Visual QA должен сравнивать не только первый viewport, а хотя бы full-page или section-level позже.

## MVP-адаптация без огромной переделки

Чтобы быстро не сломать проект, можно сделать так:

### Шаг 1
Оставить текущие сервисы, но поменять промпты:

```text
clarify-brief.prompt.ts → подключить 01-brief-and-structure.md
extract-spec.prompt.ts → сделать full landing spec, а не hero spec

design-description.prompt.ts → описывать не только hero, а visual direction + section plan
```

### Шаг 2
В `prepareReferenceImage` вместо одного reference image сделать генерацию нескольких блоков:

```text
reference/blocks/01-hero.png
reference/blocks/02-benefits.png
reference/blocks/03-features.png
...
reference/full-page-preview.png
```

### Шаг 3
Собирать `full-page-preview.png` сначала простым vertical stitch скриптом, без AI.

### Шаг 4
В `generate-code.prompt.ts` добавить контекст:

```text
approved block images + DESIGN.md/design-description + design tokens + project spec
```

## Что можно оставить на потом

Не обязательно сразу делать:

- 2–3 visual directions перед выбором стиля;
- mobile previews;
- полноценный asset-map;
- section-level screenshot QA;
- Figma export;
- deploy.

Для первого теста достаточно:

```text
brief → structure → generate blocks → stitch full preview → generate code → screenshot QA
```
