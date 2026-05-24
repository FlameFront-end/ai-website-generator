import { DesignAiService } from './design-ai.service';
import type { AiService } from './ai.service';

function createService(ai?: Partial<AiService>): DesignAiService {
  const mockAi = {
    chat: jest.fn(),
    parseJson: jest.fn(),
    extractSvg: jest.fn(),
    ...ai,
  } as unknown as AiService;

  return new DesignAiService(mockAi);
}

describe('DesignAiService', () => {
  // ---------------------------------------------------------------------------
  // sanitizeDesignDescription (private — tested via reflection)
  // ---------------------------------------------------------------------------
  describe('sanitizeDesignDescription', () => {
    let service: DesignAiService;

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
});
