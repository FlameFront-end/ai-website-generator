import type { ChatMessage } from '../providers/ai-provider.interface';
import type { DesignTokens, ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — фронтенд-разработчик. Сгенерируй код React-компонента и CSS-стили для секции сайта.

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

Требования к styles.css:
- CSS-переменные через :root не нужны — пиши значения напрямую
- Используй значения из дизайн-токенов: цвета, размеры, радиусы, тени
- Адаптивность через @media (max-width: 860px)
- Современный CSS: grid, flexbox, clamp()
- Визуальные эффекты: градиенты фона, backdrop-filter, тени
- Плавные переходы для hover-состояний кнопок
- Минимум 80 строк CSS — секция должна выглядеть как premium-лендинг

ВАЖНО: Значения в JSON должны быть строками с экранированными переносами строк (\\n), НЕ многострочными.`;

export function buildGenerateCodeMessages(
  spec: ProjectSpec,
  tokens: DesignTokens,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Спецификация проекта:\n${JSON.stringify(spec, null, 2)}\n\nДизайн-токены:\n${JSON.stringify(tokens, null, 2)}`,
    },
  ];
}
