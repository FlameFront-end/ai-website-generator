/**
 * Типы для AI сервиса
 */

export interface ProjectSpec {
  siteType: string;
  sectionType: string;
  style: string[];
  audience: string;
  requiredElements: string[];
  copy: {
    headline: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
  };
  visualPreferences: string[];
}

export interface DesignTokens {
  colors: {
    background: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    surface: string;
    border: string;
  };
  layout: {
    containerWidth: string;
    sectionPaddingY: string;
    sectionPaddingX: string;
    columns: number;
  };
  typography: {
    headlineSize: string;
    headlineWeight: number;
    bodySize: string;
    lineHeight: string;
  };
  components: {
    buttonRadius: string;
    cardRadius: string;
    cardShadow: string;
  };
}

export interface DesignDescription {
  markdown: string;
}
