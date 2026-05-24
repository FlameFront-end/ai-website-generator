import { AiService } from './ai.service';
import type { AiProviderRegistry } from './providers/ai-provider.registry';

function createService(registry?: Partial<AiProviderRegistry>): AiService {
  const mockRegistry = {
    chat: jest.fn(),
    ...registry,
  } as unknown as AiProviderRegistry;

  return new AiService(mockRegistry);
}

describe('AiService', () => {
  // ---------------------------------------------------------------------------
  // parseJson (private — tested via reflection)
  // ---------------------------------------------------------------------------
  describe('parseJson', () => {
    let service: AiService;

    beforeEach(() => {
      service = createService();
    });

    const parse = (raw: string, label = 'Test') =>
      (service as any).parseJson(raw, label);

    it('should parse plain JSON', () => {
      const result = parse('{"key":"value"}');

      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON wrapped in markdown code fences', () => {
      const raw = '```json\n{"a":1}\n```';
      const result = parse(raw);

      expect(result).toEqual({ a: 1 });
    });

    it('should parse JSON wrapped in bare code fences (no language tag)', () => {
      const raw = '```\n{"a":2}\n```';
      const result = parse(raw);

      expect(result).toEqual({ a: 2 });
    });

    it('should handle leading/trailing whitespace', () => {
      const result = parse('  \n {"x":true} \n  ');

      expect(result).toEqual({ x: true });
    });

    it('should throw on invalid JSON', () => {
      expect(() => parse('not json')).toThrow(/invalid JSON/i);
    });

    it('should include label in error message', () => {
      expect(() => parse('bad', 'ProjectSpec')).toThrow(/ProjectSpec/);
    });

    it('should parse arrays', () => {
      const result = parse('[1,2,3]');

      expect(result).toEqual([1, 2, 3]);
    });

    it('should parse nested objects from fenced block', () => {
      const raw = '```json\n{"files":[{"path":"a.ts","content":"ok"}]}\n```';
      const result = parse(raw);

      expect(result).toEqual({ files: [{ path: 'a.ts', content: 'ok' }] });
    });
  });

  // ---------------------------------------------------------------------------
  // extractSvg (private — tested via reflection)
  // ---------------------------------------------------------------------------
  describe('extractSvg', () => {
    let service: AiService;

    beforeEach(() => {
      service = createService();
    });

    const extract = (raw: string) => (service as any).extractSvg(raw);

    it('should extract raw SVG', () => {
      const svg = '<svg viewBox="0 0 100 100"><rect/></svg>';
      const result = extract(svg);

      expect(result).toBe(svg);
    });

    it('should strip markdown svg code fences', () => {
      const raw = '```svg\n<svg><circle/></svg>\n```';
      const result = extract(raw);

      expect(result).toBe('<svg><circle/></svg>');
    });

    it('should strip markdown xml code fences', () => {
      const raw = '```xml\n<svg><line/></svg>\n```';
      const result = extract(raw);

      expect(result).toBe('<svg><line/></svg>');
    });

    it('should strip text before <svg> tag', () => {
      const raw = 'Here is the SVG:\n<svg><rect/></svg>';
      const result = extract(raw);

      expect(result).toBe('<svg><rect/></svg>');
    });

    it('should throw when no <svg> tag found', () => {
      expect(() => extract('no svg here')).toThrow(/valid SVG/i);
    });

    it('should throw on empty content', () => {
      expect(() => extract('')).toThrow(/valid SVG/i);
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeDesignDescription (private — tested via reflection)
  // ---------------------------------------------------------------------------
  describe('sanitizeDesignDescription', () => {
    let service: AiService;

    beforeEach(() => {
      service = createService();
    });

    const sanitize = (md: string) =>
      (service as any).sanitizeDesignDescription(md);

    it('should strip code blocks', () => {
      const md = '# Design\n\n```tsx\nconst x = 1;\n```\n\n## Colors';
      const result = sanitize(md);

      expect(result).not.toContain('```');
      expect(result).toContain('# Design');
      expect(result).toContain('## Colors');
    });

    it('should remove implementation-related sections', () => {
      const md = [
        '# Visual',
        'Some content',
        '## Developer Handoff',
        'Code stuff',
        '## Colors',
        'Nice colors',
      ].join('\n');
      const result = sanitize(md);

      expect(result).not.toContain('Developer Handoff');
      expect(result).toContain('# Visual');
      expect(result).toContain('## Colors');
    });

    it('should collapse excessive newlines', () => {
      const md = '# Title\n\n\n\n\n## Subtitle';
      const result = sanitize(md);

      expect(result).not.toContain('\n\n\n');
    });
  });

  // ---------------------------------------------------------------------------
  // buildFallbackProjectTitle (private — tested via reflection)
  // ---------------------------------------------------------------------------
  describe('buildFallbackProjectTitle', () => {
    let service: AiService;

    beforeEach(() => {
      service = createService();
    });

    const buildTitle = (brief: string) =>
      (service as any).buildFallbackProjectTitle(brief);

    it('should take first sentence up to 60 chars', () => {
      const result = buildTitle('Build a modern SaaS dashboard. With analytics.');

      expect(result).toBe('Build a modern SaaS dashboard');
    });

    it('should return "New Project" for empty brief', () => {
      expect(buildTitle('')).toBe('New Project');
      expect(buildTitle('   ')).toBe('New Project');
    });

    it('should truncate long first sentence', () => {
      const long = 'A'.repeat(100);
      const result = buildTitle(long);

      expect(result.length).toBeLessThanOrEqual(60);
    });
  });
});
