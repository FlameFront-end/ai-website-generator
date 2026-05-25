import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { DesignTokens, GeneratedFile, ProjectSpec } from '../ai/types';
import { CodegenAiService } from '../ai/codegen-ai.service';
import { DesignAiService } from '../ai/design-ai.service';
import { CodeRepairService } from './code-repair.service';
import { CodeValidationService } from './code-validation.service';
import { ScaffoldTemplateService } from './scaffold-template.service';

const RESET_OUTPUT_ATTEMPTS = 6;
const RESET_OUTPUT_RETRY_DELAY_MS = 1000;

export interface ProjectManifest {
  projectType: string;
  title: string;
  entrypoint: string;
  files: string[];
  commands: {
    install: string;
    dev: string;
    build: string;
  };
}

export type CodegenArtifactKind =
  | 'code-plan'
  | 'content-module'
  | 'layout-module'
  | 'sections-module';

export interface CodegenArtifactPayload {
  kind: CodegenArtifactKind;
  data: unknown;
}

export interface GenerateProjectFilesOptions {
  onCodegenArtifact?: (payload: CodegenArtifactPayload) => Promise<void>;
  /** data URL of the full-page reference (used to anchor layout). */
  fullPageImageDataUrl?: string | null;
  /** Map of section.id → data URL of that section's reference image. */
  sectionImageMap?: Map<string, string>;
}

@Injectable()
export class CodeGeneratorService {
  private readonly logger = new Logger(CodeGeneratorService.name);

  constructor(
    private readonly codegenAiService: CodegenAiService,
    private readonly designAiService: DesignAiService,
    private readonly scaffoldService: ScaffoldTemplateService,
    private readonly validationService: CodeValidationService,
    private readonly repairService: CodeRepairService,
  ) {}

  /**
   * Generate all project files — scaffolding is templated, UI code comes from AI
   */
  async generateProjectFiles(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    designDescription: string,
    codePath: string,
    options: GenerateProjectFilesOptions = {},
  ): Promise<GeneratedFile[]> {
    this.logger.log('Generating project files (scaffolding + AI code)');

    let generatedUiFiles: GeneratedFile[];
    try {
      generatedUiFiles = await this.generateUiFilesWithSplitCodegen(
        brief,
        projectSpec,
        designTokens,
        designDescription,
        options,
      );
    } catch (splitError) {
      const splitMessage =
        splitError instanceof Error ? splitError.message : String(splitError);
      this.logger.warn(
        `Split AI code generation failed, falling back to single prompt: ${splitMessage}`,
      );

      const aiCode = await this.codegenAiService.generateCode(
        brief,
        projectSpec,
        designTokens,
        designDescription,
      );
      generatedUiFiles = this.validationService.normalizeGeneratedFiles(
        aiCode.files,
      );
    }

    const scaffolding =
      this.scaffoldService.createScaffoldingFiles(projectSpec);
    const files: GeneratedFile[] = [
      ...scaffolding.filter((f) => f.path !== 'README.md'),
      ...generatedUiFiles,
      ...scaffolding.filter((f) => f.path === 'README.md'),
    ];

    await this.resetOutputDirectory(codePath);
    await this.writeFiles(files, codePath);

    return files;
  }

  private async generateUiFilesWithSplitCodegen(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    codegenContext: string,
    options: GenerateProjectFilesOptions,
  ): Promise<GeneratedFile[]> {
    const codePlan = await this.codegenAiService.generateCodePlan(
      brief,
      projectSpec,
      designTokens,
      codegenContext,
    );
    const normalizedPlan = this.validationService.normalizeCodePlan(
      codePlan,
      projectSpec,
    );
    await options.onCodegenArtifact?.({
      kind: 'code-plan',
      data: normalizedPlan,
    });

    const contentModule = await this.codegenAiService.generateCodeContent(
      brief,
      projectSpec,
      designTokens,
      normalizedPlan,
      codegenContext,
    );
    await options.onCodegenArtifact?.({
      kind: 'content-module',
      data: contentModule,
    });

    const contentFiles = JSON.stringify(contentModule.files, null, 2);
    const layoutModule = await this.codegenAiService.generateCodeLayout(
      brief,
      projectSpec,
      designTokens,
      normalizedPlan,
      contentFiles,
      codegenContext,
    );
    await options.onCodegenArtifact?.({
      kind: 'layout-module',
      data: layoutModule,
    });

    const sectionModules: GeneratedFile[] = [];
    const sectionImageMap =
      options.sectionImageMap ?? new Map<string, string>();

    for (const section of normalizedPlan.sections) {
      const sectionImage = sectionImageMap.get(section.id) ?? null;
      if (sectionImage) {
        this.logger.log(
          `Section ${section.id}: attaching reference image (${Math.round(sectionImage.length / 1024)}KB data URL)`,
        );
      } else {
        this.logger.warn(
          `Section ${section.id}: no reference image available, falling back to text-only prompt`,
        );
      }

      const sectionModule = await this.codegenAiService.generateCodeSection(
        brief,
        projectSpec,
        designTokens,
        normalizedPlan,
        section,
        contentFiles,
        codegenContext,
        sectionImage,
      );
      sectionModules.push(...sectionModule.files);
    }
    await options.onCodegenArtifact?.({
      kind: 'sections-module',
      data: { files: sectionModules },
    });

    return this.repairService.normalizeGeneratedFilesWithRepair(
      {
        contentModuleFiles: contentModule.files,
        layoutModuleFiles: layoutModule.files,
        sectionModuleFiles: sectionModules,
      },
      brief,
      projectSpec,
      designTokens,
      codegenContext,
    );
  }

  /**
   * Generate project manifest
   */
  generateManifest(
    projectSpec: ProjectSpec,
    files: GeneratedFile[],
  ): ProjectManifest {
    return {
      projectType: 'next-tailwind',
      title: projectSpec.copy.headline,
      entrypoint: 'src/app/page.tsx',
      files: files.map((file) => file.path),
      commands: {
        install: 'npm install --include=dev',
        dev: 'npm run dev',
        build: 'npm run build',
      },
    };
  }

  /**
   * Generate reference SVG via AI
   */
  async generateReferenceSvg(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    designDescription: string,
  ): Promise<string> {
    return this.designAiService.generateReferenceSvg(
      brief,
      projectSpec,
      designTokens,
      designDescription,
    );
  }

  async repairProjectFilesAfterBuildFailure(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    buildError: string,
    codegenContext: string,
    codePath: string,
  ): Promise<GeneratedFile[]> {
    const repairedFiles =
      await this.repairService.repairProjectFilesAfterBuildFailure(
        brief,
        projectSpec,
        designTokens,
        buildError,
        codegenContext,
        codePath,
      );

    await this.writeFiles(repairedFiles, codePath);

    return repairedFiles;
  }

  private async writeFiles(
    files: GeneratedFile[],
    basePath: string,
  ): Promise<void> {
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(basePath, file.path);
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      }),
    );
  }

  private async resetOutputDirectory(basePath: string): Promise<void> {
    for (let attempt = 1; attempt <= RESET_OUTPUT_ATTEMPTS; attempt += 1) {
      try {
        await fs.rm(basePath, { recursive: true, force: true });
        await fs.mkdir(basePath, { recursive: true });
        return;
      } catch (error) {
        const code =
          error && typeof error === 'object' && 'code' in error
            ? String((error as Record<string, unknown>).code)
            : '';

        if (
          attempt >= RESET_OUTPUT_ATTEMPTS ||
          !['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(code)
        ) {
          throw error;
        }

        this.logger.warn(
          `Code output directory is busy, retrying reset ${attempt}/${RESET_OUTPUT_ATTEMPTS}: ${basePath}`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, RESET_OUTPUT_RETRY_DELAY_MS * attempt),
        );
      }
    }
  }
}
