import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — senior UI/UX designer, art director и frontend handoff specialist. Напиши детальное описание дизайна hero section на основе исходного брифа, спецификации и дизайн-токенов.

Описание должно быть в формате Markdown и содержать разделы:
1. Общая концепция — настроение, визуальный уровень, на какие референсы похож дизайн
2. Фон и атмосфера — цвет, градиенты, glow, глубина, декоративные элементы
3. Навигация — расположение логотипа, меню, входа и CTA, размеры, состояния
4. Композиция hero — сетка, пропорции колонок, отступы, позиция контента и dashboard
5. Текстовый блок — бейдж, заголовок, акцент в заголовке, описание, доверительная строка
6. CTA-кнопки — primary/secondary, размеры, цвета, hover, иерархия
7. Метрики — расположение, типографика, визуальный вес
8. Product dashboard card — структура карточки, header, progress, AI insights, task list, chart, team avatars
9. Floating cards — количество, расположение, стиль, тени, прозрачность
10. Design tokens usage — какие токены где применяются
11. Адаптив — desktop/tablet/mobile поведение
12. Developer handoff — конкретные указания для реализации в React/CSS

Правила:
- Используй конкретные значения из дизайн-токенов: цвета, градиенты, размеры, радиусы, тени, blur, breakpoints.
- Учитывай все детали исходного брифа и структурированной спецификации.
- Не описывай абстрактно. Каждое решение должно быть прикладным: где расположен элемент, как выглядит, какие CSS-свойства использовать.
- Если в спецификации есть navigation, metrics, productCard, floatingCards — обязательно опиши каждый из этих блоков.
- Сохраняй визуальную иерархию из contentHierarchy.
- Описание должно быть достаточно детальным, чтобы frontend-разработчик реализовал дизайн без макета.
- Не добавляй новые сущности, которые конфликтуют с брифом.`;

export function buildDesignDescriptionMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Исходный бриф:\n${brief}\n\nСпецификация:\n${JSON.stringify(spec, null, 2)}\n\nДизайн-токены:\n${JSON.stringify(tokens, null, 2)}`,
    },
  ];
}
