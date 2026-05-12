import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — дизайнер-иллюстратор. Сгенерируй SVG-референс визуального макета секции сайта.

Верни ТОЛЬКО валидный SVG-код (начинающийся с <svg и заканчивающийся </svg>). Без markdown-обёрток.

Требования:
- Размер: width="1440" height="900" viewBox="0 0 1440 900"
- Фон: rect на весь холст с цветом background из токенов
- Декоративные элементы: 1-2 размытых круга (accent / синий) с opacity для глубины
- Контейнер секции: скруглённый rect с полупрозрачной заливкой и тонкой обводкой
- Текстовый блок слева: заголовок (крупный шрифт), описание (мелкий шрифт), 2 кнопки-rect
- Если в requiredElements есть «карточка продукта» — добавь карточку справа (rect + внутренние элементы)
- Используй цвета из дизайн-токенов
- Шрифт: Inter, Arial, sans-serif
- Все text-элементы должны содержать реальный текст из copy`;

export function buildGenerateSvgMessages(
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
