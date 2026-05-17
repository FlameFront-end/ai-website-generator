/**
 * Типы для AI сервиса
 */

export interface ProjectSpec {
  projectType: string;
  idea: string;
  industry?: string;
  goal: string;
  language: string;
  stylePreference: string[];
  siteType?: string;
  sectionType?: string;
  productName: string;
  productDescription: string;
  style?: string[];
  audience: string;
  requiredElements?: string[];
  contentNotes?: string[];
  visualNotes?: string[];
  assumptions?: string[];

  sections: Array<{
    id: string;
    type:
      | 'hero'
      | 'benefits'
      | 'features'
      | 'how-it-works'
      | 'trust'
      | 'pricing'
      | 'faq'
      | 'final-cta-footer'
      | 'custom';
    title: string;
    goal: string;
    contentNotes: string[];
    visualNotes: string[];
    requiredElements: string[];
  }>;

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
  sections?: Record<
    string,
    {
      background?: string;
      spacing?: string;
      layout?: string;
      visualRole?: string;
    }
  >;
  assets?: {
    imageStyle?: string;
    iconStyle?: string;
    illustrationStyle?: string;
    avoid?: string[];
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

export interface ProjectSpecSummary {
  projectType: string;
  audience: string;
  primaryGoal: string;
  language: string;
  productName: string;
  sections: string[];
  tone: string;
  mustHave: string[];
  visualDirection: string[];
}

export interface DesignContextSummary {
  colorIntent: string;
  typographyIntent: string;
  layoutIntent: string;
  componentRules: string[];
  responsiveRules: string[];
  sectionRules: Record<string, string>;
  avoid: string[];
}

export interface ReferenceContextSummarySection {
  sectionId: string;
  title: string;
  goal: string;
  path: string;
  mimeType: string;
}

export interface ReferenceContextSummary {
  workflow: string;
  fullPagePreview: string;
  sections: ReferenceContextSummarySection[];
  notes: string[];
}

export interface CodePlanSection {
  id: string;
  componentName: string;
  filePath: string;
  purpose: string;
}

export interface CodePlan {
  architecture: string;
  files: string[];
  sections: CodePlanSection[];
  sharedComponents: string[];
}

export interface GeneratedContentModule {
  path: string;
  content: string;
}

export interface GeneratedLayoutModule {
  files: GeneratedContentModule[];
}

export interface GeneratedSectionModule {
  files: GeneratedContentModule[];
}

export type BriefQuestionType =
  | 'text'
  | 'single_choice'
  | 'multi_choice'
  | 'scale'
  | 'yes_no';

export interface BriefClarificationQuestion {
  id: string;
  type: BriefQuestionType;
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  suggestedAnswer?: string | string[] | number | boolean;
  min?: number;
  max?: number;
}

export interface BriefClarificationAnswer {
  questionId: string;
  question: string;
  value: string | string[] | number | boolean;
  skipped?: boolean;
}

export interface BriefClarificationResult {
  status: 'needs_clarification' | 'ready';
  confidence: number;
  estimatedTotalQuestions?: number;
  missingFields: string[];
  understoodSummary?: string;
  projectTitle?: string;
  questions: BriefClarificationQuestion[];
  finalBrief: string | null;
}
