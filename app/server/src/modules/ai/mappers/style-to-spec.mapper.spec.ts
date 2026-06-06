import { StyleToSpecMapper } from './style-to-spec.mapper';
import type { StyleVariant } from '../types';

const mockStyle: StyleVariant = {
  id: 'style-1',
  name: 'Modern Dark',
  description: 'A sleek dark-themed design with bold gradients',
  visualStyle: 'Bold gradient overlays',
  colorPalette: [
    '#0F172A',
    '#3B82F6',
    '#8B5CF6',
    '#FFFFFF',
    '#111827',
    '#E5E7EB',
  ],
  typographyStyle: 'Inter, sans-serif',
  layoutStyle: 'Full-width hero with split content',
  moodKeywords: ['modern', 'tech', 'premium'],
};

describe('StyleToSpecMapper', () => {
  // ---------------------------------------------------------------------------
  // toProjectSpec
  // ---------------------------------------------------------------------------
  describe('toProjectSpec', () => {
    it('should map style to ProjectSpec with correct structure', () => {
      const brief = 'Build a SaaS landing page';
      const spec = StyleToSpecMapper.toProjectSpec(brief, mockStyle);

      expect(spec.projectType).toBe('landing-page');
      expect(spec.idea).toBe(brief);
      expect(spec.productName).toBe('Modern Dark');
      expect(spec.productDescription).toBe(brief);
      expect(spec.sections).toHaveLength(4);
      expect(spec.sections[0].type).toBe('hero');
      expect(spec.sections[3].type).toBe('final-cta-footer');
    });

    it('should detect English language from brief', () => {
      const brief = 'Target site language: English\nBuild a SaaS';
      const spec = StyleToSpecMapper.toProjectSpec(brief, mockStyle);

      expect(spec.language).toBe('English');
    });

    it('should default to Russian when brief does not contain English marker', () => {
      const brief = 'Создать лендинг для SaaS продукта';
      const spec = StyleToSpecMapper.toProjectSpec(brief, mockStyle);

      expect(spec.language).toBe('Russian');
    });

    it('should include style preferences from variant', () => {
      const spec = StyleToSpecMapper.toProjectSpec('test', mockStyle);

      expect(spec.stylePreference).toEqual([
        'Modern Dark',
        'Bold gradient overlays',
        'Full-width hero with split content',
      ]);
    });

    it('should set colorHints from palette', () => {
      const spec = StyleToSpecMapper.toProjectSpec('test', mockStyle);

      expect(spec.colorHints?.background).toBe('#0F172A');
      expect(spec.colorHints?.accent).toEqual(['#3B82F6', '#8B5CF6']);
      expect(spec.colorHints?.text).toBe('#E5E7EB');
    });

    it('should populate navigation with style name', () => {
      const spec = StyleToSpecMapper.toProjectSpec('test', mockStyle);

      expect(spec.navigation?.logo).toBe('Modern Dark');
    });
  });

  // ---------------------------------------------------------------------------
  // toDesignTokens
  // ---------------------------------------------------------------------------
  describe('toDesignTokens', () => {
    it('should map full 6-color palette correctly', () => {
      const tokens = StyleToSpecMapper.toDesignTokens(mockStyle);

      expect(tokens.colors.background).toBe('#0F172A');
      expect(tokens.colors.accent).toBe('#3B82F6');
      expect(tokens.colors.accentSecondary).toBe('#8B5CF6');
      expect(tokens.colors.surface).toBe('#FFFFFF');
      expect(tokens.colors.textPrimary).toBe('#111827');
      expect(tokens.colors.border).toBe('#E5E7EB');
    });

    it('should throw when palette has fewer than 6 colors', () => {
      const shortStyle: StyleVariant = {
        ...mockStyle,
        colorPalette: ['#000'],
      };

      expect(() => StyleToSpecMapper.toDesignTokens(shortStyle)).toThrow(
        /insufficient color palette/i,
      );
    });

    it('should set 2 columns when layout includes "split"', () => {
      const tokens = StyleToSpecMapper.toDesignTokens(mockStyle);

      expect(tokens.layout.columns).toBe(2);
    });

    it('should set 1 column when layout does not include "split"', () => {
      const centeredStyle: StyleVariant = {
        ...mockStyle,
        layoutStyle: 'Centered hero',
      };
      const tokens = StyleToSpecMapper.toDesignTokens(centeredStyle);

      expect(tokens.layout.columns).toBe(1);
    });

    it('should set fontFamily from typographyStyle', () => {
      const tokens = StyleToSpecMapper.toDesignTokens(mockStyle);

      expect(tokens.typography.fontFamily).toBe('Inter, sans-serif');
    });

    it('should set hero section visual info', () => {
      const tokens = StyleToSpecMapper.toDesignTokens(mockStyle);

      expect(tokens.sections?.hero?.layout).toBe(
        'Full-width hero with split content',
      );
      expect(tokens.sections?.hero?.visualRole).toBe('Bold gradient overlays');
    });
  });

  // ---------------------------------------------------------------------------
  // toCodegenContext
  // ---------------------------------------------------------------------------
  describe('toCodegenContext', () => {
    it('should produce a multiline context string', () => {
      const ctx = StyleToSpecMapper.toCodegenContext(mockStyle);

      expect(ctx).toContain('style=Modern Dark');
      expect(ctx).toContain('visual=Bold gradient overlays');
      expect(ctx).toContain('palette=#0F172A,#3B82F6,#8B5CF6');
      expect(ctx).toContain('type=Inter, sans-serif');
      expect(ctx).toContain('mood=modern,tech,premium');
    });
  });

  // ---------------------------------------------------------------------------
  // toDesignDescription
  // ---------------------------------------------------------------------------
  describe('toDesignDescription', () => {
    it('should produce markdown with headings', () => {
      const md = StyleToSpecMapper.toDesignDescription(mockStyle);

      expect(md).toContain('# Modern Dark');
      expect(md).toContain('## Visual Direction');
      expect(md).toContain('## Color Palette');
      expect(md).toContain('- #0F172A');
      expect(md).toContain('## Typography');
      expect(md).toContain('## Layout Approach');
      expect(md).toContain('## Mood');
      expect(md).toContain('modern, tech, premium');
    });
  });
});
