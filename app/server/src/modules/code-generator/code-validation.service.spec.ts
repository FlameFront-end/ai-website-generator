import { CodeValidationService } from './code-validation.service';
import type { GeneratedFile } from './code-generator.service';
import type { CodePlan, ProjectSpec } from '../ai/types';

describe('CodeValidationService', () => {
  let service: CodeValidationService;

  beforeEach(() => {
    service = new CodeValidationService();
  });

  // ---------------------------------------------------------------------------
  // normalizeGeneratedFiles
  // ---------------------------------------------------------------------------
  describe('normalizeGeneratedFiles', () => {
    const validFiles: GeneratedFile[] = [
      { path: 'src/app/page.tsx', content: 'export default function Page() {}' },
      { path: 'src/app/layout.tsx', content: 'export default function Layout({ children }: any) { return children; }' },
      { path: 'src/app/globals.css', content: ':root { --bg: #fff; }' },
      { path: 'src/components/landing/landing-page.tsx', content: 'export default function LP() {}' },
    ];

    it('should return valid files unchanged', () => {
      const result = service.normalizeGeneratedFiles(validFiles);

      expect(result).toHaveLength(4);
      expect(result.map((f) => f.path)).toEqual([
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'src/components/landing/landing-page.tsx',
      ]);
    });

    it('should strip leading ./ from paths', () => {
      const files = validFiles.map((f) => ({ ...f, path: `./${f.path}` }));
      const result = service.normalizeGeneratedFiles(files);

      expect(result.map((f) => f.path)).toContain('src/app/page.tsx');
    });

    it('should normalize backslashes to forward slashes', () => {
      const files = validFiles.map((f) => ({
        ...f,
        path: f.path.replaceAll('/', '\\'),
      }));
      const result = service.normalizeGeneratedFiles(files);

      expect(result.every((f) => !f.path.includes('\\'))).toBe(true);
    });

    it('should filter out forbidden scaffold files', () => {
      const files: GeneratedFile[] = [
        ...validFiles,
        { path: 'package.json', content: '{}' },
        { path: 'tsconfig.json', content: '{}' },
        { path: 'next.config.mjs', content: 'export default {}' },
        { path: 'tailwind.config.ts', content: 'export default {}' },
      ];
      const result = service.normalizeGeneratedFiles(files);

      expect(result).toHaveLength(4);
    });

    it('should filter out files with disallowed extensions', () => {
      const files: GeneratedFile[] = [
        ...validFiles,
        { path: 'src/readme.md', content: '# hello' },
        { path: 'src/data.json', content: '{}' },
        { path: 'src/utils.js', content: 'const x = 1;' },
      ];
      const result = service.normalizeGeneratedFiles(files);

      expect(result).toHaveLength(4);
    });

    it('should filter out absolute paths', () => {
      const files: GeneratedFile[] = [
        ...validFiles,
        { path: '/etc/passwd', content: 'root:x:0:0' },
      ];
      const result = service.normalizeGeneratedFiles(files);

      expect(result).toHaveLength(4);
    });

    it('should filter out paths with ..', () => {
      const files: GeneratedFile[] = [
        ...validFiles,
        { path: 'src/../secret.ts', content: 'export {}' },
      ];
      const result = service.normalizeGeneratedFiles(files);

      expect(result).toHaveLength(4);
    });

    it('should throw on duplicate paths after normalization', () => {
      const files: GeneratedFile[] = [
        ...validFiles,
        { path: 'src/app/page.tsx', content: 'duplicate' },
      ];

      expect(() => service.normalizeGeneratedFiles(files)).toThrow(
        /duplicate files/i,
      );
    });

    it('should throw on empty file content', () => {
      const files = validFiles.map((f) =>
        f.path === 'src/app/page.tsx' ? { ...f, content: '   ' } : f,
      );

      expect(() => service.normalizeGeneratedFiles(files)).toThrow(
        /empty files/i,
      );
    });

    it('should throw when required Next.js files are missing', () => {
      const files = validFiles.filter((f) => f.path !== 'src/app/page.tsx');

      expect(() => service.normalizeGeneratedFiles(files)).toThrow(
        /required Next\.js files/i,
      );
    });

    it('should canonicalize known path aliases', () => {
      const files: GeneratedFile[] = [
        { path: 'src/app/page.tsx', content: 'export default function Page() {}' },
        { path: 'src/app/layout.tsx', content: 'export default function Layout({ children }: any) { return children; }' },
        { path: 'src/app/globals.css', content: ':root {}' },
        { path: 'src/components/landing/landingpage.tsx', content: 'export default function LP() {}' },
      ];
      const result = service.normalizeGeneratedFiles(files);

      expect(result.map((f) => f.path)).toContain(
        'src/components/landing/landing-page.tsx',
      );
    });

    it('should throw on parent-directory imports (../)', () => {
      const files: GeneratedFile[] = [
        { path: 'src/app/page.tsx', content: 'import X from "../lib/x";' },
        { path: 'src/app/layout.tsx', content: 'export default function L({ children }: any) { return children; }' },
        { path: 'src/app/globals.css', content: ':root {}' },
        { path: 'src/components/landing/landing-page.tsx', content: 'export default function LP() {}' },
      ];

      expect(() => service.normalizeGeneratedFiles(files)).toThrow(
        /parent-directory import/i,
      );
    });

    it('should throw on missing local imports', () => {
      const files: GeneratedFile[] = [
        { path: 'src/app/page.tsx', content: 'import { Foo } from "@/components/foo";' },
        { path: 'src/app/layout.tsx', content: 'export default function L({ children }: any) { return children; }' },
        { path: 'src/app/globals.css', content: ':root {}' },
        { path: 'src/components/landing/landing-page.tsx', content: 'export default function LP() {}' },
      ];

      expect(() => service.normalizeGeneratedFiles(files)).toThrow(
        /missing local imports/i,
      );
    });

    it('should allow @/ imports that resolve to existing files', () => {
      const files: GeneratedFile[] = [
        { path: 'src/app/page.tsx', content: 'import LP from "@/components/landing/landing-page";' },
        { path: 'src/app/layout.tsx', content: 'export default function L({ children }: any) { return children; }' },
        { path: 'src/app/globals.css', content: ':root {}' },
        { path: 'src/components/landing/landing-page.tsx', content: 'export default function LP() {}' },
      ];

      expect(() => service.normalizeGeneratedFiles(files)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // normalizeCodePlan
  // ---------------------------------------------------------------------------
  describe('normalizeCodePlan', () => {
    const baseSpec: ProjectSpec = {
      projectType: 'landing-page',
      idea: 'test',
      goal: 'test goal',
      language: 'English',
      stylePreference: ['modern'],
      productName: 'Test',
      productDescription: 'Test product',
      audience: 'Developers',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          title: 'Hero',
          goal: 'Explain the offer',
          contentNotes: [],
          visualNotes: [],
          requiredElements: [],
        },
        {
          id: 'features',
          type: 'features',
          title: 'Features',
          goal: 'Show features',
          contentNotes: [],
          visualNotes: [],
          requiredElements: [],
        },
      ],
      copy: {
        headline: 'H',
        description: 'D',
        primaryButton: 'CTA',
        secondaryButton: 'More',
      },
      visualPreferences: ['modern'],
    };

    it('should keep valid plan sections', () => {
      const plan: CodePlan = {
        architecture: 'Next.js app',
        files: ['a.ts'],
        sections: [
          { id: 'hero', componentName: 'Hero', filePath: 'src/hero.tsx', purpose: 'Hero' },
        ],
        sharedComponents: [],
      };
      const result = service.normalizeCodePlan(plan, baseSpec);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe('hero');
    });

    it('should derive sections from spec when plan sections are empty', () => {
      const plan: CodePlan = {
        architecture: '',
        files: [],
        sections: [],
        sharedComponents: [],
      };
      const result = service.normalizeCodePlan(plan, baseSpec);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].id).toBe('hero');
      expect(result.sections[1].id).toBe('features');
      expect(result.sections[0].componentName).toBe('HeroSection');
    });

    it('should fall back architecture when missing', () => {
      const plan: CodePlan = {
        architecture: '',
        files: [],
        sections: [{ id: 'x', componentName: 'X', filePath: 'x.tsx', purpose: 'x' }],
        sharedComponents: [],
      };
      const result = service.normalizeCodePlan(plan, baseSpec);

      expect(result.architecture).toBe('Next.js App Router landing page modules');
    });
  });

  // ---------------------------------------------------------------------------
  // mergeGeneratedFiles
  // ---------------------------------------------------------------------------
  describe('mergeGeneratedFiles', () => {
    it('should deduplicate by path, keeping last occurrence', () => {
      const files: GeneratedFile[] = [
        { path: 'src/a.tsx', content: 'v1' },
        { path: 'src/b.tsx', content: 'v1' },
        { path: 'src/a.tsx', content: 'v2' },
      ];
      const result = service.mergeGeneratedFiles(files);

      expect(result).toHaveLength(2);
      expect(result.find((f) => f.path === 'src/a.tsx')?.content).toBe('v2');
    });

    it('should normalize backslashes', () => {
      const files: GeneratedFile[] = [
        { path: 'src\\a.tsx', content: 'ok' },
      ];
      const result = service.mergeGeneratedFiles(files);

      expect(result[0].path).toBe('src/a.tsx');
    });
  });
});
