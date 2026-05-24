import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { DesignTokens, GeneratedFile, ProjectSpec } from '../ai/types';
import { extractErrorMessage } from '../../common/utils';
import { CodegenAiService } from '../ai/codegen-ai.service';
import { CodeValidationService } from './code-validation.service';

type RepairableCodegenModule =
  | 'content-module'
  | 'layout-module'
  | 'sections-module';

@Injectable()
export class CodeRepairService {
  private readonly logger = new Logger(CodeRepairService.name);

  constructor(
    private readonly codegenAiService: CodegenAiService,
    private readonly validationService: CodeValidationService,
  ) {}

  async normalizeGeneratedFilesWithRepair(
    modules: {
      contentModuleFiles: GeneratedFile[];
      layoutModuleFiles: GeneratedFile[];
      sectionModuleFiles: GeneratedFile[];
    },
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    codegenContext: string,
  ): Promise<GeneratedFile[]> {
    const files = this.validationService.mergeGeneratedFiles([
      ...modules.contentModuleFiles,
      ...modules.layoutModuleFiles,
      ...modules.sectionModuleFiles,
    ]);

    try {
      return this.validationService.normalizeGeneratedFiles(files);
    } catch (error) {
      const message = extractErrorMessage(error);
      this.logger.warn(
        `Split code validation failed, trying module repair: ${message}`,
      );

      const moduleRepair = await this.tryRepairGeneratedModule(
        modules,
        brief,
        projectSpec,
        designTokens,
        message,
        codegenContext,
      );

      if (moduleRepair) {
        try {
          return this.validationService.normalizeGeneratedFiles(moduleRepair);
        } catch (repairError) {
          const repairMessage = extractErrorMessage(repairError);
          this.logger.warn(
            `Split module repair failed validation, trying full repair: ${repairMessage}`,
          );
        }
      }

      const repairedCode = await this.codegenAiService.repairCodeFiles(
        brief,
        projectSpec,
        designTokens,
        message,
        files,
        codegenContext,
      );

      return this.validationService.normalizeGeneratedFiles(repairedCode.files);
    }
  }

  async repairProjectFilesAfterBuildFailure(
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    buildError: string,
    codegenContext: string,
    codePath: string,
  ): Promise<GeneratedFile[]> {
    const currentFiles = await this.readGeneratedUiFiles(codePath);
    const repairedCode = await this.codegenAiService.repairCodeFiles(
      brief,
      projectSpec,
      designTokens,
      buildError,
      currentFiles,
      codegenContext,
    );
    return this.validationService.normalizeGeneratedFiles(repairedCode.files);
  }

  private async tryRepairGeneratedModule(
    modules: {
      contentModuleFiles: GeneratedFile[];
      layoutModuleFiles: GeneratedFile[];
      sectionModuleFiles: GeneratedFile[];
    },
    brief: string,
    projectSpec: ProjectSpec,
    designTokens: DesignTokens,
    validationError: string,
    codegenContext: string,
  ): Promise<GeneratedFile[] | null> {
    const targetModule = this.inferRepairableModule(validationError);
    const moduleFiles = this.getModuleFiles(modules, targetModule);
    const contextFiles = this.validationService
      .mergeGeneratedFiles([
        ...modules.contentModuleFiles,
        ...modules.layoutModuleFiles,
        ...modules.sectionModuleFiles,
      ])
      .filter(
        (file) =>
          !moduleFiles.some((moduleFile) => moduleFile.path === file.path),
      );

    try {
      const repairedModule = await this.codegenAiService.repairCodeModule(
        brief,
        projectSpec,
        designTokens,
        targetModule,
        validationError,
        moduleFiles,
        contextFiles,
        codegenContext,
      );

      return this.validationService.mergeGeneratedFiles([
        ...contextFiles,
        ...repairedModule.files,
      ]);
    } catch (error) {
      const message = extractErrorMessage(error);
      this.logger.warn(`Split module repair failed: ${message}`);
      return null;
    }
  }

  private inferRepairableModule(errorMessage: string): RepairableCodegenModule {
    if (
      errorMessage.includes('src/content/') ||
      errorMessage.includes('src/config/')
    ) {
      return 'content-module';
    }

    if (
      errorMessage.includes('src/app/') ||
      errorMessage.includes('src/components/landing/landing-page.tsx') ||
      errorMessage.includes('required Next.js files')
    ) {
      return 'layout-module';
    }

    return 'sections-module';
  }

  private getModuleFiles(
    modules: {
      contentModuleFiles: GeneratedFile[];
      layoutModuleFiles: GeneratedFile[];
      sectionModuleFiles: GeneratedFile[];
    },
    targetModule: RepairableCodegenModule,
  ): GeneratedFile[] {
    if (targetModule === 'content-module') {
      return modules.contentModuleFiles;
    }

    if (targetModule === 'layout-module') {
      return modules.layoutModuleFiles;
    }

    return modules.sectionModuleFiles;
  }

  async readGeneratedUiFiles(basePath: string): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const allowedExtensions = new Set(['.ts', '.tsx', '.css']);

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(absolutePath);
          continue;
        }

        const relativePath = path
          .relative(basePath, absolutePath)
          .replaceAll('\\', '/');
        if (
          relativePath.startsWith('src/') &&
          allowedExtensions.has(path.extname(relativePath))
        ) {
          files.push({
            path: relativePath,
            content: await fs.readFile(absolutePath, 'utf8'),
          });
        }
      }
    };

    await walk(path.join(basePath, 'src'));

    return files;
  }
}
