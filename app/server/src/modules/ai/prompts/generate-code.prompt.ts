import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — senior фронтенд-разработчик. Сгенерируй код React-компонента и CSS-стили для секции сайта на основе всей накопленной AI-цепочки.

Верни ТОЛЬКО валидный JSON (без markdown-обёрток) со следующей структурой:
{
  "mainTsx": "полный код файла src/main.tsx",
  "stylesCss": "полный код файла src/styles.css"
}

Требования к main.tsx:
- Импорт React и ReactDOM
- Импорт './styles.css'
- Функциональный компонент App с JSX-разметкой секции
- ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
- Семантичный HTML: <main>, <section>, <h1>, <p>, <a>
- CSS-классы на элементах (БЕЗ inline-стилей)
- Текст из спецификации (copy)
- Все элементы из requiredElements
- Используй навигацию, метрики, productCard, floatingCards и contentHierarchy из спецификации, если они есть

Требования к styles.css:
- CSS-переменные через :root не нужны — пиши значения напрямую
- Используй значения из дизайн-токенов: цвета, размеры, радиусы, тени
- Адаптивность через @media (max-width: 860px)
- Современный CSS: grid, flexbox, clamp()
- Визуальные эффекты: градиенты фона, backdrop-filter, тени
- Плавные переходы для hover-состояний кнопок
- Минимум 80 строк CSS — секция должна выглядеть как premium-лендинг
- Сверяйся с designDescription: итоговая верстка должна соответствовать описанию дизайна

ВАЖНО: Значения в JSON должны быть строками с экранированными переносами строк (\\n), НЕ многострочными.`;

export function buildGenerateCodeMessages(
  brief: string,
  spec: ProjectSpec,
  tokens: DesignTokens,
  designDescription: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Исходный бриф:\n${brief}\n\nСпецификация проекта:\n${JSON.stringify(spec, null, 2)}\n\nДизайн-токены:\n${JSON.stringify(tokens, null, 2)}\n\nОписание дизайна:\n${designDescription}`,
    },
  ];
}
