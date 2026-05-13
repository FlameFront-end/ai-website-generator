import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — senior UI/UX designer и art director. Напиши детальное визуальное описание всей landing page для visual-first workflow.

Описание будет использоваться для генерации отдельных изображений секций, поэтому оно должно задавать общий стиль и секционный ритм, а не только hero.

Markdown должен содержать разделы:
1. Общая концепция страницы
2. Единая визуальная система
3. Секционный ритм и композиция full page
4. Навигация и hero
5. Описание каждой секции из spec.sections
6. CTA, доверие, метрики и социальное доказательство
7. Design tokens usage
8. Адаптивное поведение
9. Anti-patterns: что нельзя рисовать и генерировать

Правила:
- Используй конкретные значения из дизайн-токенов: цвета, градиенты, размеры, радиусы, тени, blur, breakpoints.
- Для каждой секции укажи: цель, композицию, ключевой контент, визуальный фокус, фон, карточки/изображения/иконки, ритм отступов.
- Помни правило one section = one image. Каждое описание секции должно быть самостоятельным промптом для картинки.
- Не создавай full-page дизайн заново на этапе preview: preview должен складываться из секционных изображений.
- Не пиши код, JSX, CSS, Tailwind-классы, markdown code fences или developer handoff.
- Не добавляй сущности, конфликтующие с брифом.`;

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
