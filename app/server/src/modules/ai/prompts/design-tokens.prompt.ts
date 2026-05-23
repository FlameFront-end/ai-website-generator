import type { ProjectSpec } from '../ai.types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import {
  buildSkillContext,
  joinPromptSections,
} from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(
    ['product-global-rules', 'design-system-assets', 'taste-visual-quality'],
    6000,
  ),
  `You are a senior product UI designer and design-system architect.

Generate page-level design tokens for the whole one-page landing page, not only for the hero. Tokens must support a visual-first workflow: one section = one reference image, then a full-page preview.

Return ONLY valid JSON. No markdown.

Required JSON shape:
{
  "colors": {
    "background": "#hex or rgb()",
    "backgroundGradient": "CSS background gradient",
    "textPrimary": "#hex",
    "textSecondary": "#hex",
    "textMuted": "#hex",
    "accent": "#hex",
    "accentSecondary": "#hex",
    "accentGradient": "CSS linear-gradient(...)",
    "surface": "rgba() or #hex",
    "surfaceElevated": "rgba() or #hex",
    "border": "rgba() or #hex",
    "glow": "rgba() glow color",
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
    "mobileLayout": "short mobile layout rule"
  },
  "sections": {
    "01-hero": {
      "background": "section background rule",
      "spacing": "section spacing rhythm",
      "layout": "composition principle",
      "visualRole": "role in the full page"
    }
  },
  "assets": {
    "imageStyle": "image treatment",
    "iconStyle": "icon style",
    "illustrationStyle": "illustration style",
    "avoid": ["things to avoid"]
  }
}

Rules:
- Explicit brief/spec preferences override defaults.
- Keep one coherent style across all section reference images.
- Avoid one-color palettes; include neutral background/surface/text/border plus 1-2 meaningful accents.
- Avoid default purple/blue AI glow unless requested.
- All values must be concrete CSS values or short implementation-ready descriptions.
- sections must include every spec.sections[].id.`,
);

export function buildDesignTokensMessages(
  brief: string,
  spec: ProjectSpec,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: `Original brief:\n${brief}\n\nProjectSpec:\n${JSON.stringify(spec, null, 2)}`,
    },
  ];
}
