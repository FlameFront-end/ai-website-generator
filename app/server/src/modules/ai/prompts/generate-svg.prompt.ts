import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — дизайнер-иллюстратор. Сгенерируй SVG-reference для одной секции сайта на основе брифа, page-level спецификации, дизайн-токенов и описания дизайна.

SVG — вспомогательный артефакт, не главный источник макета. Основной visual-first workflow использует секционные изображения.

Верни ТОЛЬКО валидный SVG-код, начинающийся с <svg и заканчивающийся </svg>. Без markdown.

Требования:
- Размер: width="1440" height="900" viewBox="0 0 1440 900".
- Покажи одну качественную desktop website section, а не весь сайт.
- Не рисуй browser chrome и device frames.
- Используй реальные тексты из copy/spec.
- Отрази секционный ритм, цвета и компоненты из DesignTokens.
- Не используй случайные blobs и generic AI glow, если они не указаны в стиле.
- Все text-элементы должны быть читаемыми и не накладываться друг на друга.`;

export function buildGenerateSvgMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  designDescription: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Исходный бриф:\n${brief}\n\nСпецификация:\n${JSON.stringify(spec, null, 2)}\n\nДизайн-токены:\n${JSON.stringify(tokens, null, 2)}\n\nОписание дизайна:\n${designDescription}`,
    },
  ];
}
