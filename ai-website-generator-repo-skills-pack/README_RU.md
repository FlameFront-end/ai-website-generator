# Compact skills pack под текущий репозиторий `ai-website-generator`

Этот пакет сделан не как абстрактная идеальная система из 22 файлов, а как компактный слой правил под уже существующий каркас проекта.

В текущем репозитории уже есть рабочие части:

- `app/server/src/modules/ai/prompts/*.ts` — промпты для анализа брифа, токенов, описания дизайна, кода и SVG.
- `app/server/src/modules/images/images.service.ts` — генерация изображений через Replicate.
- `app/server/src/modules/pipeline/pipeline.service.ts` — пайплайн запуска.
- `app/server/src/modules/code-generator/code-generator.service.ts` — генерация Next.js проекта.
- `app/server/src/modules/pipeline/build.service.ts` — сборка проекта.
- `app/server/src/modules/pipeline/screenshot.service.ts` — скриншоты.
- `app/server/src/modules/pipeline/visual-qa.service.ts` — сравнение результата с референсом.

Главная правка: сейчас проект больше похож на генератор hero/reference + code. Нужно перевести его на visual-first workflow:

```text
brief → project spec → visual directions → block images → full-page preview → code → screenshot QA → repair/export
```

Для MVP не нужно 22 MD-файла. Достаточно 6 крупных product-skills:

```text
skills/product/00-global-product-rules.md
skills/product/01-brief-and-structure.md
skills/product/02-image-generation-workflow.md
skills/product/03-design-system-assets.md
skills/product/04-image-to-code.md
skills/product/05-build-qa-repair-export.md
```

Главный файл для генерации изображений:

```text
skills/product/02-image-generation-workflow.md
```

Он должен использоваться вместе с open-source Taste Skill:

```text
vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md
```

Опционально для mobile previews:

```text
vendor/taste-skill/skills/imagegen-frontend-mobile/SKILL.md
```

Сначала подключайте эти rules как текстовый контекст к существующим prompt builders, не ломая архитектуру. Потом можно постепенно выносить в отдельный SkillLoader.
