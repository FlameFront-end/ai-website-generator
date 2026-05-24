import { Injectable } from '@nestjs/common';
import path from 'node:path';

import type { StyleVariant } from '../ai/types';
import { StyleToSpecMapper } from '../ai/mappers/style-to-spec.mapper';
import { loadImageAsDataUrl } from '../ai/image-attachment';
import { ArtifactType, RunStatus } from '../../common/enums';
import { RunEntity } from '../../db/entities';
import { sleep } from '../../common/utils';
import { PIPELINE_STEP_DELAY_MS } from '../../common/constants/pipeline';
import { StorageService } from '../storage/storage.service';
import type {
  CodegenArtifactKind,
  CodegenArtifactPayload,
} from '../code-generator/code-generator.service';
import { CodeGeneratorService } from '../code-generator/code-generator.service';
import { ArtifactService } from './artifact.service';
import { PipelineStateService } from './pipeline-state.service';
import { BuildService } from './build.service';
import { ScreenshotService } from './screenshot.service';
import { VisualQAService } from './visual-qa.service';
const MAX_BUILD_REPAIR_ATTEMPTS = 3;

@Injectable()
export class CodegenStepService {
  constructor(
    private readonly state: PipelineStateService,
    private readonly storageService: StorageService,
    private readonly artifactService: ArtifactService,
    private readonly codeGeneratorService: CodeGeneratorService,
    private readonly buildService: BuildService,
    private readonly screenshotService: ScreenshotService,
    private readonly visualQAService: VisualQAService,
  ) {}

  async prepareFrontendProject(
    run: RunEntity,
    selectedStyle: StyleVariant,
    designDescription: string,
    userId: string,
  ): Promise<void> {
    const codeRun = await this.state.updateRunStatus(
      run,
      RunStatus.Running,
      'prepare_frontend_project',
      userId,
    );
    await this.state.addLog(run.id, 'Generating website code');
    await sleep(PIPELINE_STEP_DELAY_MS);

    const codePath = path.join(
      this.storageService.getRunPath(userId, codeRun.id),
      'code',
    );

    const codegenContext = StyleToSpecMapper.toCodegenContext(selectedStyle);

    const codegenImages = await this.buildCodegenImageContext(codeRun.id);
    await this.state.addLog(
      codeRun.id,
      `Codegen visual input: full-page=${codegenImages.fullPageImageDataUrl ? 'yes' : 'no'}, section blocks=${codegenImages.sectionImageMap.size}`,
    );

    const projectSpec = StyleToSpecMapper.toProjectSpec(
      run.brief,
      selectedStyle,
    );
    const designTokens = StyleToSpecMapper.toDesignTokens(selectedStyle);

    await this.codeGeneratorService.generateProjectFiles(
      run.brief,
      projectSpec,
      designTokens,
      codegenContext,
      codePath,
      {
        onCodegenArtifact: (payload: CodegenArtifactPayload) =>
          this.saveCodegenArtifact(
            codeRun.id,
            userId,
            codeRun.id,
            payload.kind,
            payload.data,
          ),
        fullPageImageDataUrl: codegenImages.fullPageImageDataUrl,
        sectionImageMap: codegenImages.sectionImageMap,
      },
    );

    await this.state.addLog(codeRun.id, 'Website code ready');

    await this.runBuildAndQAWithRepair(
      codeRun,
      codeRun.id,
      userId,
      selectedStyle,
      codegenContext,
      codePath,
    );
  }

  async runBuildAndQAWithRepair(
    run: RunEntity,
    slug: string,
    userId: string,
    selectedStyle: StyleVariant,
    codegenContext: string,
    codePath: string,
  ): Promise<void> {
    let currentRun = run;

    for (
      let attempt = 1;
      attempt <= MAX_BUILD_REPAIR_ATTEMPTS + 1;
      attempt += 1
    ) {
      const result = await this.buildService.buildProjectOnce(
        currentRun,
        slug,
        userId,
        attempt,
      );
      currentRun = result.run;

      if (currentRun.status !== RunStatus.BuildFailed) {
        const screenshotRun = await this.screenshotService.takeScreenshots(
          currentRun,
          slug,
          userId,
        );
        await this.visualQAService.runVisualQA(
          screenshotRun,
          run.id,
          slug,
          userId,
        );

        await this.state.updateRunStatus(
          screenshotRun,
          RunStatus.AwaitingFinalApproval,
          'awaiting_final_approval',
          userId,
        );
        await this.state.addLog(
          screenshotRun.id,
          'Review the result and finalize the project',
        );
        return;
      }

      if (attempt > MAX_BUILD_REPAIR_ATTEMPTS || !result.error) {
        return;
      }

      await this.state.addLog(
        run.id,
        `Feeding build error to AI for code repair (${attempt}/${MAX_BUILD_REPAIR_ATTEMPTS})`,
        { error: result.error },
      );
      const projectSpec = StyleToSpecMapper.toProjectSpec(
        run.brief,
        selectedStyle,
      );
      const designTokens = StyleToSpecMapper.toDesignTokens(selectedStyle);

      await this.codeGeneratorService.repairProjectFilesAfterBuildFailure(
        run.brief,
        projectSpec,
        designTokens,
        result.error,
        codegenContext,
        codePath,
      );
    }
  }

  async runBuildAndQA(
    run: RunEntity,
    slug: string,
    userId: string,
  ): Promise<void> {
    const builtRun = await this.buildService.buildProject(run, slug, userId, 1);
    if (builtRun.status === RunStatus.BuildFailed) {
      return;
    }

    const screenshotRun = await this.screenshotService.takeScreenshots(
      builtRun,
      slug,
      userId,
    );
    await this.visualQAService.runVisualQA(screenshotRun, run.id, slug, userId);

    await this.state.updateRunStatus(
      screenshotRun,
      RunStatus.AwaitingFinalApproval,
      'awaiting_final_approval',
      userId,
    );
    await this.state.addLog(
      screenshotRun.id,
      'Review the result and finalize the project',
    );
  }

  async regenerateCode(
    run: RunEntity,
    instruction: string,
    userId: string,
  ): Promise<void> {
    const selectedStyleArtifact = await this.artifactService.getArtifactByType(
      run.id,
      ArtifactType.SelectedStyle,
    );

    if (!selectedStyleArtifact) {
      await this.state.failRun(run, 'Selected style not found');
      return;
    }

    const styleContent = await this.storageService.readArtifactFile(
      selectedStyleArtifact.path,
    );
    const selectedStyle = JSON.parse(styleContent) as StyleVariant;

    const updatedBrief = instruction
      ? `${run.brief}\n\nCode edit: ${instruction}`
      : run.brief;
    await this.state.updateRun(run, { brief: updatedBrief });

    const designDescription =
      StyleToSpecMapper.toDesignDescription(selectedStyle);
    await this.prepareFrontendProject(
      run,
      selectedStyle,
      designDescription,
      userId,
    );
  }

  // ===================== Helper methods =====================

  private async saveCodegenArtifact(
    runId: string,
    userId: string,
    slug: string,
    kind: CodegenArtifactKind,
    data: unknown,
  ): Promise<void> {
    const artifactTypeMap: Record<CodegenArtifactKind, ArtifactType> = {
      'code-plan': ArtifactType.CodePlan,
      'content-module': ArtifactType.CodeContentModule,
      'layout-module': ArtifactType.CodeLayoutModule,
      'sections-module': ArtifactType.CodeSectionsModule,
    };

    const filenameMap: Record<CodegenArtifactKind, string> = {
      'code-plan': 'code-plan.json',
      'content-module': 'content-module.json',
      'layout-module': 'layout-module.json',
      'sections-module': 'sections-module.json',
    };

    const relativePath = this.storageService.getRunRelativePath(
      userId,
      runId,
      'codegen',
      filenameMap[kind],
    );
    const absolutePath = this.storageService.getRunAbsolutePath(
      userId,
      runId,
      'codegen',
      filenameMap[kind],
    );

    await this.storageService.writeGeneratedFile(
      absolutePath,
      JSON.stringify(data, null, 2),
    );

    await this.artifactService.saveArtifact(
      runId,
      artifactTypeMap[kind],
      relativePath,
      'application/json',
    );
  }

  private async buildCodegenImageContext(runId: string): Promise<{
    fullPageImageDataUrl: string | null;
    sectionImageMap: Map<string, string>;
  }> {
    const referenceArtifact = await this.artifactService.getArtifactByType(
      runId,
      ArtifactType.ReferenceImage,
    );
    const referenceBlocks = await this.artifactService.getArtifactsByType(
      runId,
      ArtifactType.ReferenceBlock,
    );

    if (!referenceArtifact) {
      const sectionImageMap = await this.buildSectionImageMap(referenceBlocks);
      return { fullPageImageDataUrl: null, sectionImageMap };
    }

    const fullPagePath = this.storageService.getArtifactAbsolutePath(
      referenceArtifact.path,
    );
    const fullPageImageDataUrl = await loadImageAsDataUrl(fullPagePath);

    return {
      fullPageImageDataUrl,
      sectionImageMap: await this.buildSectionImageMap(referenceBlocks),
    };
  }

  private async buildSectionImageMap(
    referenceBlocks: Array<{ path: string }>,
  ): Promise<Map<string, string>> {
    const sectionImageMap = new Map<string, string>();

    for (const block of referenceBlocks) {
      const fileName = path.basename(block.path).replace(/\.[^.]+$/, '');
      const sectionId = fileName.replace(/^\d+-/, '');
      const absolutePath = this.storageService.getArtifactAbsolutePath(
        block.path,
      );
      sectionImageMap.set(sectionId, await loadImageAsDataUrl(absolutePath));
    }

    return sectionImageMap;
  }
}
