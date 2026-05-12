import { Injectable, Logger } from '@nestjs/common';

import type { DesignDescription, DesignTokens, ProjectSpec } from './ai.types';

export type { DesignDescription, DesignTokens, ProjectSpec };

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /**
   * Extract project specification from brief
   * TODO: Replace with real AI service call
   */
  extractProjectSpec(brief: string): ProjectSpec {
    this.logger.log('Extracting project spec from brief (MOCK)');
    return this.mockProjectSpec(brief);
  }

  /**
   * Generate design tokens based on project spec
   * TODO: Replace with real AI service call
   */
  generateDesignTokens(spec: ProjectSpec): DesignTokens {
    this.logger.log('Generating design tokens (MOCK)');
    return this.mockDesignTokens(spec);
  }

  /**
   * Generate design description
   * TODO: Replace with real AI service call
   */
  generateDesignDescription(
    spec: ProjectSpec,
    tokens: DesignTokens,
  ): DesignDescription {
    this.logger.log('Generating design description (MOCK)');
    return {
      markdown: this.mockDesignDescription(spec, tokens),
    };
  }

  private mockProjectSpec(brief: string): ProjectSpec {
    const style = this.extractStyleItems(brief);
    const hasProductCard = /карточк[аи]\s+продукт|product\s+card/i.test(brief);

    return {
      siteType: /лендинг|landing/i.test(brief) ? 'лендинг' : 'сайт',
      sectionType: /hero|первый экран|hero-блок/i.test(brief)
        ? 'hero-блок'
        : 'hero-блок',
      style,
      audience: /финансов/i.test(brief)
        ? 'финансовые команды'
        : 'общая аудитория',
      requiredElements: [
        'заголовок',
        'описание',
        'основная кнопка',
        'вторая кнопка',
        ...(hasProductCard ? ['карточка продукта'] : []),
      ],
      copy: {
        headline: this.extractLineValue(
          brief,
          'Заголовок',
          'ИИ-лендинг по брифу',
        ),
        description: this.extractLineValue(
          brief,
          'Описание',
          'Сгенерируйте понятный первый экран на основе продуктового брифа.',
        ),
        primaryButton: this.extractLineValue(
          brief,
          'Основная кнопка',
          'Начать',
        ),
        secondaryButton: this.extractLineValue(
          brief,
          'Вторая кнопка',
          'Смотреть демо',
        ),
      },
      visualPreferences: style,
    };
  }

  private mockDesignTokens(spec: ProjectSpec): DesignTokens {
    const isDark = this.hasStyle(spec, /темн|dark/i);
    const isPremium = this.hasStyle(spec, /дорог|преми|premium/i);

    return {
      colors: {
        background: isDark ? '#050816' : '#F7F8FB',
        textPrimary: isDark ? '#FFFFFF' : '#101828',
        textSecondary: isDark ? '#A7B0C0' : '#667085',
        accent: '#7C3AED',
        surface: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.14)' : '#E4E7EC',
      },
      layout: {
        containerWidth: '1200px',
        sectionPaddingY: '96px',
        sectionPaddingX: '32px',
        columns: spec.requiredElements.includes('карточка продукта') ? 2 : 1,
      },
      typography: {
        headlineSize: isPremium ? '72px' : '64px',
        headlineWeight: 700,
        bodySize: '18px',
        lineHeight: '1.08',
      },
      components: {
        buttonRadius: '999px',
        cardRadius: '24px',
        cardShadow: isDark
          ? '0 32px 80px rgba(91, 64, 255, 0.24)'
          : '0 24px 60px rgba(16, 24, 40, 0.12)',
      },
    };
  }

  private mockDesignDescription(
    spec: ProjectSpec,
    tokens: DesignTokens,
  ): string {
    const productCardText = spec.requiredElements.includes('карточка продукта')
      ? 'Справа располагается крупная карточка продукта с полупрозрачной поверхностью, мягкой обводкой и свечением.'
      : 'Композиция строится вокруг текстового блока без отдельной продуктовой карточки.';

    return `# Описание дизайна

## Фон

Основной фон: \`${tokens.colors.background}\`.
Визуальный стиль: ${spec.style.join(', ')}.
Акцентный цвет: \`${tokens.colors.accent}\`.
Для глубины используются мягкие радиальные подсветки и темные/нейтральные переходы, которые можно реализовать через CSS.

## Сетка

Тип блока: ${spec.sectionType}.
Максимальная ширина контейнера: \`${tokens.layout.containerWidth}\`.
Количество колонок: ${tokens.layout.columns}.
Текстовый блок расположен слева. ${productCardText}
Вертикальные отступы секции: \`${tokens.layout.sectionPaddingY}\`, горизонтальные: \`${tokens.layout.sectionPaddingX}\`.

## Типографика

Заголовок: \`${tokens.typography.headlineSize}\`, насыщенность ${tokens.typography.headlineWeight}, плотная высота строки \`${tokens.typography.lineHeight}\`.
Основной цвет текста: \`${tokens.colors.textPrimary}\`.
Вторичный текст: \`${tokens.colors.textSecondary}\`, размер \`${tokens.typography.bodySize}\`.

## Кнопки

Основная кнопка использует акцентный цвет \`${tokens.colors.accent}\`, белый текст и радиус \`${tokens.components.buttonRadius}\`.
Вторая кнопка выглядит спокойнее: прозрачная или поверхностная заливка, тонкая обводка и тот же радиус.

## Карточки

Поверхность карточек: \`${tokens.colors.surface}\`.
Обводка: \`${tokens.colors.border}\`.
Радиус карточек: \`${tokens.components.cardRadius}\`.
Тень: \`${tokens.components.cardShadow}\`.

## Адаптив

На мобильном экране блок становится одноколоночным: сначала текст, затем карточка или визуальный блок.
Заголовок уменьшается, кнопки остаются крупными и удобными для касания.
`;
  }

  private extractStyleItems(brief: string): string[] {
    const styleBlock =
      brief.match(/стиль\s*:\s*([\s\S]*?)(?:\n\s*\n|текст\s*:|$)/i)?.[1] ?? '';
    const items = styleBlock
      .split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);

    return items.length > 0 ? items : ['современный'];
  }

  private hasStyle(spec: ProjectSpec, pattern: RegExp): boolean {
    return spec.style.some((item) => pattern.test(item));
  }

  private extractLineValue(
    brief: string,
    label: string,
    fallback: string,
  ): string {
    const match = brief.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
    return match?.[1]?.trim() || fallback;
  }
}
