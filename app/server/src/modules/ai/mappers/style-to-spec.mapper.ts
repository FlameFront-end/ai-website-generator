import type { DesignTokens, ProjectSpec, StyleVariant } from '../types';

/**
 * Pure utility: maps a StyleVariant to ProjectSpec, DesignTokens,
 * codegen context string, and design description markdown.
 * No side-effects, no DI dependencies.
 */
export class StyleToSpecMapper {
  static toProjectSpec(brief: string, style: StyleVariant): ProjectSpec {
    return {
      projectType: 'landing-page',
      idea: brief,
      goal: 'Generate a modern landing page from the user brief and selected visual style',
      language: brief.includes('Target site language: English')
        ? 'English'
        : 'Russian',
      stylePreference: [style.name, style.visualStyle, style.layoutStyle],
      productName: style.name,
      productDescription: brief,
      audience: 'Target audience from the user brief',
      requiredElements: [
        'clear headline',
        'value proposition',
        'primary call to action',
        'trust signals',
      ],
      contentNotes: [brief],
      visualNotes: [style.description, style.visualStyle, style.layoutStyle],
      assumptions: [
        'Infer missing product, audience and conversion details from the brief',
      ],
      sections: [
        {
          id: 'hero',
          type: 'hero',
          title: 'Hero',
          goal: 'Explain the offer and drive the main action',
          contentNotes: [brief],
          visualNotes: [style.visualStyle],
          requiredElements: ['headline', 'description', 'primary CTA'],
        },
        {
          id: 'benefits',
          type: 'benefits',
          title: 'Benefits',
          goal: 'Show the key reasons to choose the offer',
          contentNotes: ['Infer 3-4 strongest benefits from the brief'],
          visualNotes: [style.visualStyle],
          requiredElements: ['benefit cards', 'short explanations'],
        },
        {
          id: 'features',
          type: 'features',
          title: 'Features',
          goal: 'Explain what the product or service includes',
          contentNotes: ['Infer key features from the brief'],
          visualNotes: [style.visualStyle],
          requiredElements: ['feature list', 'supporting visual structure'],
        },
        {
          id: 'final-cta',
          type: 'final-cta-footer',
          title: 'Final CTA',
          goal: 'Convert the visitor',
          contentNotes: ['Create a concise closing call to action'],
          visualNotes: [style.visualStyle],
          requiredElements: ['CTA button', 'footer'],
        },
      ],
      copy: {
        headline: 'Generated landing page headline',
        description: brief,
        primaryButton: 'Get Started',
        secondaryButton: 'Learn More',
      },
      navigation: {
        logo: style.name,
        menuItems: ['Benefits', 'Features', 'Contact'],
        ctaButton: 'Get Started',
      },
      visualPreferences: [
        style.visualStyle,
        style.typographyStyle,
        style.layoutStyle,
      ],
      colorHints: {
        background: style.colorPalette[0],
        accent: style.colorPalette.slice(1, 3),
        text: style.colorPalette.at(-1),
      },
    };
  }

  static toDesignTokens(style: StyleVariant): DesignTokens {
    if (style.colorPalette.length < 6) {
      throw new Error(
        `StyleVariant "${style.name}" has insufficient color palette (${style.colorPalette.length}/6 required)`,
      );
    }

    const [background, accent, accentSecondary, surface, textPrimary, border] =
      style.colorPalette;

    return {
      colors: {
        background,
        textPrimary,
        textSecondary: '#64748B',
        accent,
        accentSecondary,
        surface,
        border,
      },
      layout: {
        containerWidth: '1200px',
        sectionPaddingY: '96px',
        sectionPaddingX: '24px',
        columns: style.layoutStyle.toLowerCase().includes('split') ? 2 : 1,
        gridGap: '24px',
        heroMinHeight: '720px',
      },
      typography: {
        headlineSize: 'clamp(48px, 7vw, 92px)',
        headlineMobileSize: '44px',
        headlineWeight: 800,
        bodySize: '18px',
        lineHeight: '1.55',
        fontFamily: style.typographyStyle,
      },
      components: {
        buttonRadius: '999px',
        buttonHeight: '52px',
        cardRadius: '28px',
        cardShadow: '0 24px 80px rgba(15, 23, 42, 0.14)',
      },
      sections: {
        hero: {
          layout: style.layoutStyle,
          visualRole: style.visualStyle,
        },
      },
      assets: {
        imageStyle: style.visualStyle,
        illustrationStyle: style.visualStyle,
        avoid: ['generic stock-photo look', 'unstyled default UI'],
      },
      responsive: {
        desktopBreakpoint: '1024px',
        tabletBreakpoint: '768px',
        mobileBreakpoint: '640px',
        mobileLayout: 'single-column responsive layout',
      },
    };
  }

  static toCodegenContext(style: StyleVariant): string {
    return [
      'Project Context:',
      `- Style name: ${style.name}`,
      `- Visual style: ${style.visualStyle}`,
      `- Color palette: ${style.colorPalette.join(', ')}`,
      `- Typography: ${style.typographyStyle}`,
      `- Layout: ${style.layoutStyle}`,
      `- Mood: ${style.moodKeywords.join(', ')}`,
      '',
      `Description: ${style.description}`,
    ].join('\n');
  }

  static toDesignDescription(style: StyleVariant): string {
    return [
      `# ${style.name}`,
      '',
      style.description,
      '',
      '## Visual Direction',
      style.visualStyle,
      '',
      '## Color Palette',
      ...style.colorPalette.map((c) => `- ${c}`),
      '',
      '## Typography',
      style.typographyStyle,
      '',
      '## Layout Approach',
      style.layoutStyle,
      '',
      '## Mood',
      style.moodKeywords.join(', '),
    ].join('\n');
  }
}
