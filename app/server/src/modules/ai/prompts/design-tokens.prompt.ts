import type { ChatMessage } from '../providers/ai-provider.interface';
import type { ProjectSpec } from '../ai.types';

const SYSTEM = `Ты — senior product UI designer и design system architect для visual-first landing page generator.

Сгенерируй page-level дизайн-токены для всей одностраничной landing page, а не только для hero. Токены должны поддерживать секционные визуальные референсы: one section = one image, затем full-page preview.

Верни ТОЛЬКО валидный JSON без markdown:
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
    "columns": 1,
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
    "buttonRadius": "12px",
    "buttonHeight": "56px",
    "cardRadius": "16px",
    "smallCardRadius": "12px",
    "cardShadow": "CSS box-shadow",
    "glowShadow": "CSS box-shadow",
    "navSurface": "rgba()",
    "badgeSurface": "rgba()",
    "progressHeight": "8px"
  },
  "effects": {
    "backdropBlur": "16px",
    "glowBlur": "72px",
    "transition": "180ms ease",
    "hoverTransform": "translateY(-2px)"
  },
  "responsive": {
    "desktopBreakpoint": "1200px",
    "tabletBreakpoint": "900px",
    "mobileBreakpoint": "640px",
    "mobileLayout": "описание мобильной компоновки"
  },
  "sections": {
    "01-hero": {
      "background": "вариант фона",
      "spacing": "ритм отступов",
      "layout": "композиционный принцип",
      "visualRole": "роль секции в странице"
    }
  },
  "assets": {
    "imageStyle": "стиль изображений",
    "iconStyle": "стиль иконок",
    "illustrationStyle": "стиль иллюстраций",
    "avoid": ["что не использовать"]
  }
}

Правила:
- Сверяйся с брифом и спецификацией: явные пожелания важнее дефолтов.
- Токены должны задавать единый стиль для всех секций и предотвращать разнобой между block images.
- Не делай однотонную палитру. Добавь нейтральные surface/text/border и 1-2 осмысленных accent цвета.
- Избегай purple/blue AI glow как дефолта, если бриф этого не просит.
- Все значения должны быть конкретными CSS-значениями или короткими прикладными описаниями.
- sections должен содержать ключи для всех spec.sections[].id.`;

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
