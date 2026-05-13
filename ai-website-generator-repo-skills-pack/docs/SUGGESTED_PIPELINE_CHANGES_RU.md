# Предлагаемые изменения пайплайна

## Было сейчас

```text
prepareBrief
→ AwaitingSpecApproval
→ prepareDesignArtifacts
→ AwaitingDesignApproval
→ prepareReferenceImage
→ AwaitingReferenceApproval
→ prepareFrontendProject
→ AwaitingCodeApproval
→ build + screenshots + visualQA
→ AwaitingFinalApproval
```

## Должно стать для visual-first MVP

Минимальный вариант:

```text
prepareBrief
→ AwaitingSpecApproval
→ prepareDesignArtifacts
→ AwaitingDesignApproval
→ prepareBlockReferenceImages
→ prepareFullPagePreview
→ AwaitingReferenceApproval
→ prepareFrontendProject
→ AwaitingCodeApproval
→ build + screenshots + visualQA
→ AwaitingFinalApproval
```

## Что переименовать/расширить

### Вместо

```text
prepareReferenceImage
```

### Лучше

```text
prepareReferenceImages
```

или разделить:

```text
prepareBlockReferenceImages
prepareFullPagePreview
```

## Что делает prepareBlockReferenceImages

```text
1. Берёт ProjectSpec.sections
2. Для каждой секции собирает prompt
3. Подмешивает imagegen-frontend-web/SKILL.md
4. Генерирует картинку через ImagesService
5. Сохраняет в reference/blocks/
6. Создаёт blocks-manifest.json
```

## Что делает prepareFullPagePreview

```text
1. Читает blocks-manifest.json
2. Берёт все block images
3. Склеивает вертикально
4. Сохраняет reference/full-page-preview.png
5. Сохраняет artifact FullPagePreview
```

## Что делать с approve/restart/regenerate

Сейчас в UI есть шаг `reference`.

Для MVP можно оставить один approve step:

```text
reference = пользователь проверяет все blocks + full-page preview
```

В будущем лучше разрешить:

```text
regenerate one block
edit one block
approve full page
```

## Важная правка для code generation

`prepareFrontendProject` должен получать не только:

```text
brief, projectSpec, tokens, designDescription
```

но и:

```text
blocksManifest
fullPagePreviewPath
reference image paths
```

Даже если LLM не видит сами изображения через API, эти пути и описания нужны для логики. Если API поддерживает vision, лучше передавать изображения напрямую.
