import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { getAppConfig } from '../../config/config.module';
import type {
  CodePlan,
  CodePlanSection,
  DesignTokens,
  GeneratedFile,
  GeneratedLayoutModule,
  GeneratedSectionModule,
  ProjectSpec,
} from './types';
import { AiService } from './ai.service';
import {
  buildGenerateCodeMessages,
  buildCodePlanMessages,
  buildGenerateContentMessages,
  buildGenerateLayoutMessages,
  buildGenerateSectionMessages,
  buildRepairCodeFilesMessages,
  buildRepairCodeModuleMessages,
} from './prompts';

@Injectable()
export class CodegenAiService {
  private readonly logger = new Logger(CodegenAiService.name);
  private readonly codeQualityReferenceUrl: string;

  constructor(
    private readonly ai: AiService,
    configService: ConfigService,
  ) {
    this.codeQualityReferenceUrl =
      getAppConfig(configService).ai.codeQualityReferenceUrl;
  }

  /**
   * Generate React component code + CSS via LLM
   */
  async generateCode(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    designDescription: string,
  ): Promise<{ files: GeneratedFile[] }> {
    this.logger.log('Generating frontend code via AI');

    const result = await this.ai.chat('code', {
      messages: buildGenerateCodeMessages(
        brief,
        spec,
        tokens,
        designDescription,
        this.codeQualityReferenceUrl,
      ),
      json: true,
      temperature: 0.3,
      maxTokens: 16384,
    });

    return this.ai.parseJson<{ files: GeneratedFile[] }>(
      result.content,
      'GeneratedCode',
    );
  }

  async generateCodePlan(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codegenContext: string,
  ): Promise<CodePlan> {
    this.logger.log('Generating frontend code plan via AI');

    const result = await this.ai.chat('code', {
      messages: buildCodePlanMessages(
        brief,
        spec,
        tokens,
        codegenContext,
        this.codeQualityReferenceUrl,
      ),
      json: true,
      temperature: 0.2,
      maxTokens: 4096,
    });

    return this.ai.parseJson<CodePlan>(result.content, 'CodePlan');
  }

  async generateCodeContent(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codePlan: CodePlan,
    codegenContext: string,
  ): Promise<{ files: GeneratedFile[] }> {
    this.logger.log('Generating frontend content files via AI');

    const result = await this.ai.chat('code', {
      messages: buildGenerateContentMessages(
        brief,
        spec,
        tokens,
        codePlan,
        codegenContext,
        this.codeQualityReferenceUrl,
      ),
      json: true,
      temperature: 0.25,
      maxTokens: 8192,
    });

    return this.ai.parseJson<{ files: GeneratedFile[] }>(
      result.content,
      'GeneratedContent',
    );
  }

  async generateCodeLayout(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codePlan: CodePlan,
    contentFiles: string,
    codegenContext: string,
  ): Promise<GeneratedLayoutModule> {
    this.logger.log('Generating frontend layout files via AI');

    const result = await this.ai.chat('code', {
      messages: buildGenerateLayoutMessages(
        brief,
        spec,
        tokens,
        codePlan,
        contentFiles,
        codegenContext,
        this.codeQualityReferenceUrl,
      ),
      json: true,
      temperature: 0.25,
      maxTokens: 8192,
    });

    return this.ai.parseJson<GeneratedLayoutModule>(
      result.content,
      'GeneratedLayout',
    );
  }

  async generateCodeSection(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    codePlan: CodePlan,
    section: CodePlanSection,
    contentFiles: string,
    codegenContext: string,
    sectionImageDataUrl: string | null,
  ): Promise<GeneratedSectionModule> {
    this.logger.log(`Generating frontend section via AI: ${section.id}`);

    const result = await this.ai.chat('code', {
      messages: buildGenerateSectionMessages(
        brief,
        spec,
        tokens,
        codePlan,
        section,
        contentFiles,
        codegenContext,
        sectionImageDataUrl,
        this.codeQualityReferenceUrl,
      ),
      json: true,
      temperature: 0.3,
      maxTokens: 8192,
    });

    return this.ai.parseJson<GeneratedSectionModule>(
      result.content,
      'GeneratedSection',
    );
  }

  async repairCodeFiles(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    validationError: string,
    files: GeneratedFile[],
    codegenContext: string,
  ): Promise<{ files: GeneratedFile[] }> {
    this.logger.log('Repairing generated frontend files via AI');

    const result = await this.ai.chat('code', {
      messages: buildRepairCodeFilesMessages(
        brief,
        spec,
        tokens,
        validationError,
        files,
        codegenContext,
      ),
      json: true,
      temperature: 0.15,
      maxTokens: 16384,
    });

    return this.ai.parseJson<{ files: GeneratedFile[] }>(
      result.content,
      'RepairedCodeFiles',
    );
  }

  async repairCodeModule(
    brief: string,
    spec: ProjectSpec,
    tokens: DesignTokens,
    targetModule: string,
    validationError: string,
    moduleFiles: GeneratedFile[],
    contextFiles: GeneratedFile[],
    codegenContext: string,
  ): Promise<{ files: GeneratedFile[] }> {
    this.logger.log(
      `Repairing generated frontend module via AI: ${targetModule}`,
    );

    const result = await this.ai.chat('code', {
      messages: buildRepairCodeModuleMessages(
        brief,
        spec,
        tokens,
        targetModule,
        validationError,
        moduleFiles,
        contextFiles,
        codegenContext,
      ),
      json: true,
      temperature: 0.15,
      maxTokens: 8192,
    });

    return this.ai.parseJson<{ files: GeneratedFile[] }>(
      result.content,
      'RepairedCodeModule',
    );
  }
}
