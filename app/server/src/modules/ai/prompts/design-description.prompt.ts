import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — UI/UX дизайнер. Напиши подробное описание дизайна секции на основе спецификации и дизайн-токенов.

Описание должно быть в формате Markdown и содержать разделы:
1. Фон — цвет, градиенты, визуальные эффекты
2. Сетка — тип лейаута, ширина контейнера, колонки, отступы
3. Типографика — размеры, веса, цвета заголовков и текста
4. Кнопки — стили основной и вторичной кнопки
5. Карточки — поверхность, обводка, тень, радиус
6. Адаптив — как секция ведёт себя на мобильных

Используй конкретные значения из дизайн-токенов. Описание должно быть достаточно детальным, чтобы разработчик мог реализовать дизайн без макета.`;

export function buildDesignDescriptionMessages(
  spec: ProjectSpec,
  tokens: DesignTokens,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Спецификация:\n${JSON.stringify(spec, null, 2)}\n\nДизайн-токены:\n${JSON.stringify(tokens, null, 2)}`,
    },
  ];
}
