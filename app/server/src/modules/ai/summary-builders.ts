import type {
  DesignContextSummary,
  DesignTokens,
  ProjectSpec,
  ProjectSpecSummary,
  ReferenceContextSummary,
} from './types';

interface ReferenceManifestBlock {
  sectionId: string;
  title?: string;
  path: string;
  mimeType?: string;
}

interface ReferenceManifest {
  workflow?: string;
  fullPagePreview?: string;
  blocks?: ReferenceManifestBlock[];
}

export function buildProjectSpecSummary(spec: ProjectSpec): ProjectSpecSummary {
  return {
    projectType: spec.projectType,
    audience: spec.audience,
    primaryGoal: spec.goal,
    language: spec.language,
    productName: spec.productName,
    sections: spec.sections.map((section) => `${section.id}:${section.type}`),
    tone:
      spec.stylePreference.join(', ') || 'clear, modern, conversion-focused',
    mustHave: [
      ...(spec.requiredElements ?? []),
      ...spec.sections.flatMap((section) => section.requiredElements),
    ].slice(0, 24),
    visualDirection: [
      ...spec.stylePreference,
      ...spec.visualPreferences,
      ...(spec.visualNotes ?? []),
    ].slice(0, 16),
  };
}

export function buildDesignContextSummary(
  spec: ProjectSpec,
  tokens: DesignTokens,
): DesignContextSummary {
  return {
    colorIntent: [
      `background ${tokens.colors.background}`,
      tokens.colors.backgroundGradient,
      `accent ${tokens.colors.accent}`,
      tokens.colors.accentSecondary,
      `surface ${tokens.colors.surface}`,
    ]
      .filter(Boolean)
      .join('; '),
    typographyIntent: [
      `headline ${tokens.typography.headlineSize}`,
      tokens.typography.headlineMobileSize
        ? `mobile ${tokens.typography.headlineMobileSize}`
        : null,
      `weight ${tokens.typography.headlineWeight}`,
      `body ${tokens.typography.bodySize}`,
      `line-height ${tokens.typography.lineHeight}`,
      tokens.typography.fontFamily,
    ]
      .filter(Boolean)
      .join('; '),
    layoutIntent: [
      `container ${tokens.layout.containerWidth}`,
      `section Y ${tokens.layout.sectionPaddingY}`,
      `section X ${tokens.layout.sectionPaddingX}`,
      `columns ${tokens.layout.columns}`,
      tokens.layout.gridGap ? `gap ${tokens.layout.gridGap}` : null,
    ]
      .filter(Boolean)
      .join('; '),
    componentRules: [
      `button radius ${tokens.components.buttonRadius}`,
      tokens.components.buttonHeight
        ? `button height ${tokens.components.buttonHeight}`
        : null,
      `card radius ${tokens.components.cardRadius}`,
      `card shadow ${tokens.components.cardShadow}`,
      tokens.components.navSurface
        ? `nav ${tokens.components.navSurface}`
        : null,
    ].filter((rule): rule is string => Boolean(rule)),
    responsiveRules: [
      tokens.responsive?.mobileLayout,
      tokens.responsive?.desktopBreakpoint
        ? `desktop ${tokens.responsive.desktopBreakpoint}`
        : null,
      tokens.responsive?.tabletBreakpoint
        ? `tablet ${tokens.responsive.tabletBreakpoint}`
        : null,
      tokens.responsive?.mobileBreakpoint
        ? `mobile ${tokens.responsive.mobileBreakpoint}`
        : null,
    ].filter((rule): rule is string => Boolean(rule)),
    sectionRules: Object.fromEntries(
      spec.sections.map((section) => {
        const tokenSection = tokens.sections?.[section.id];
        return [
          section.id,
          [
            section.title,
            section.goal,
            tokenSection?.layout,
            tokenSection?.spacing,
            tokenSection?.visualRole,
          ]
            .filter(Boolean)
            .join('; '),
        ];
      }),
    ),
    avoid: tokens.assets?.avoid ?? [],
  };
}

export function buildReferenceContextSummary(
  spec: ProjectSpec,
  manifest: ReferenceManifest,
  fallbackFullPagePath: string,
): ReferenceContextSummary {
  const goalsBySection = new Map(
    spec.sections.map((section) => [section.id, section.goal]),
  );
  const titlesBySection = new Map(
    spec.sections.map((section) => [section.id, section.title]),
  );

  const sections = (manifest.blocks ?? []).map((block) => ({
    sectionId: block.sectionId,
    title:
      block.title ?? titlesBySection.get(block.sectionId) ?? block.sectionId,
    goal: goalsBySection.get(block.sectionId) ?? '',
    path: block.path,
    mimeType: block.mimeType ?? 'image/png',
  }));

  return {
    workflow: manifest.workflow ?? 'one-section-one-image',
    fullPagePreview: manifest.fullPagePreview ?? fallbackFullPagePath,
    sections,
    notes: [
      'Use these block references as the primary visual source for code.',
      'Match layout, spacing, hierarchy and palette to the approved blocks.',
      'Do not redesign sections; do not rasterize whole sections in code.',
    ],
  };
}
