/**
 * Типы для AI сервиса
 */

export interface ProjectSpec {
  siteType: string;
  sectionType: string;
  productName: string;
  productDescription: string;
  style: string[];
  audience: string;
  requiredElements: string[];

  copy: {
    badge?: string;
    headline: string;
    headlineAccent?: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
    trustLine?: string;
  };

  navigation?: {
    logo: string;
    menuItems: string[];
    ctaButton?: string;
    authButton?: string;
  };

  metrics?: Array<{
    value: string;
    label: string;
  }>;

  productCard?: {
    title: string;
    statusBadge?: string;
    sections: Array<{
      type: 'progress' | 'insights' | 'task-list' | 'chart' | 'team' | 'custom';
      title?: string;
      content: string;
      details?: Record<string, string>;
    }>;
  };

  floatingCards?: Array<{
    value: string;
    label: string;
  }>;

  colorHints?: {
    background?: string;
    accent?: string[];
    text?: string;
  };

  visualPreferences: string[];
  contentHierarchy?: string[];
}

export interface DesignTokens {
  colors: {
    background: string;
    backgroundGradient?: string;
    textPrimary: string;
    textSecondary: string;
    textMuted?: string;
    accent: string;
    accentSecondary?: string;
    accentGradient?: string;
    surface: string;
    surfaceElevated?: string;
    border: string;
    glow?: string;
    success?: string;
    warning?: string;
  };
  layout: {
    containerWidth: string;
    sectionPaddingY: string;
    sectionPaddingX: string;
    columns: number;
    gridGap?: string;
    navHeight?: string;
    heroMinHeight?: string;
    cardWidth?: string;
  };
  typography: {
    headlineSize: string;
    headlineMobileSize?: string;
    headlineWeight: number;
    bodySize: string;
    captionSize?: string;
    navSize?: string;
    lineHeight: string;
    fontFamily?: string;
  };
  components: {
    buttonRadius: string;
    buttonHeight?: string;
    cardRadius: string;
    smallCardRadius?: string;
    cardShadow: string;
    glowShadow?: string;
    navSurface?: string;
    badgeSurface?: string;
    progressHeight?: string;
  };
  effects?: {
    backdropBlur?: string;
    glowBlur?: string;
    transition?: string;
    hoverTransform?: string;
  };
  responsive?: {
    desktopBreakpoint?: string;
    tabletBreakpoint?: string;
    mobileBreakpoint?: string;
    mobileLayout?: string;
  };
}

export interface DesignDescription {
  markdown: string;
}
