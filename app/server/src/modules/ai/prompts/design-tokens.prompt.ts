import type { ChatMessage } from '../providers/ai-provider.interface';
import type { ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — senior product UI designer и design system architect. На основе исходного брифа и спецификации проекта сгенерируй богатые дизайн-токены для premium SaaS hero section.

Верни ТОЛЬКО валидный JSON (без markdown-обёрток) со следующей структурой:
{
  "colors": {
    "background": "#hex или rgb()",
    "backgroundGradient": "CSS background gradient",
    "textPrimary": "#hex",
    "textSecondary": "#hex",
    "textMuted": "#hex",
    "accent": "#hex",
    "accentSecondary": "#hex",
    "accentGradient": "CSS linear-gradient(...)",
    "surface": "rgba() или #hex",
    "surfaceElevated": "rgba() или #hex",
    "border": "rgba() или #hex",
    "glow": "rgba() цвет свечения",
    "success": "#hex",
    "warning": "#hex"
  },
  "layout": {
    "containerWidth": "1200px",
    "sectionPaddingY": "96px",
    "sectionPaddingX": "32px",
    "columns": 1 или 2,
    "gridGap": "64px",
    "navHeight": "72px",
    "heroMinHeight": "100vh",
    "cardWidth": "520px"
  },
  "typography": {
    "headlineSize": "64px",
    "headlineMobileSize": "42px",
    "headlineWeight": 700,
    "bodySize": "18px",
    "captionSize": "14px",
    "navSize": "14px",
    "lineHeight": "1.08",
    "fontFamily": "Inter, ui-sans-serif, system-ui, sans-serif"
  },
  "components": {
    "buttonRadius": "999px" или "12px",
    "buttonHeight": "56px",
    "cardRadius": "24px",
    "smallCardRadius": "18px",
    "cardShadow": "CSS box-shadow значение",
    "glowShadow": "CSS box-shadow для glow",
    "navSurface": "rgba()",
    "badgeSurface": "rgba()",
    "progressHeight": "8px"
  },
  "effects": {
    "backdropBlur": "20px",
    "glowBlur": "80px",
    "transition": "180ms ease",
    "hoverTransform": "translateY(-2px)"
  },
  "responsive": {
    "desktopBreakpoint": "1200px",
    "tabletBreakpoint": "900px",
    "mobileBreakpoint": "640px",
    "mobileLayout": "описание мобильной компоновки"
  }
}

Правила:
- Сверяйся с исходным брифом: если в брифе есть палитра, настроение, запреты или конкретные визуальные указания — они важнее общих догадок.
- Токены должны быть достаточно полными, чтобы по ним можно было собрать навигацию, hero-контент, CTA, метрики, dashboard card, progress bar, floating cards и glow-фон.
- Цвета должны гармонировать между собой и соответствовать стилю проекта.
- Если стиль «тёмный» / «dark» — background должен быть тёмным, textPrimary светлым.
- Если стиль «светлый» / «light» — наоборот.
- accent — яркий, контрастный цвет для кнопок и акцентов.
- accentGradient должен подходить для главной кнопки, progress bar и выделенной части заголовка.
- surface и surfaceElevated должны работать для glassmorphism-карточек.
- border должен быть тонким и премиальным, без сильного контраста.
- glow должен быть полупрозрачным цветом для фоновых свечений.
- cardShadow и glowShadow должны быть реалистичными CSS-значениями.
- Все значения должны быть конкретными CSS-значениями, а не общими описаниями.`;

export function buildDesignTokensMessages(
  brief: string,
  spec: ProjectSpec,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Исходный бриф:\n\n${brief}\n\nСпецификация проекта:\n\n${JSON.stringify(spec, null, 2)}`,
    },
  ];
}
