# Как технически подключать MD skills к текущим prompt builders

Самый быстрый способ: создать utility, который читает `.md` файлы и подмешивает их в system prompt.

Примерная идея:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';

export function loadSkill(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

export function joinSystemPrompt(...parts: string[]): string {
  return parts.filter(Boolean).join('\n\n---\n\n');
}
```

И потом в prompt-файле:

```ts
const SYSTEM = joinSystemPrompt(
  loadSkill('skills/product/00-global-product-rules.md'),
  loadSkill('skills/product/02-image-generation-workflow.md'),
  loadSkill('vendor/taste-skill/skills/imagegen-frontend-web/SKILL.md'),
  `Текущие конкретные инструкции этого prompt-файла...`,
);
```

Можно сначала вообще не делать loader, а руками вставить выдержки из MD в `SYSTEM`. Но loader лучше для поддержки.
