import { BadRequestException } from '@nestjs/common';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ArtifactType } from '../../common/enums';
import { ArtifactReaderService } from './artifact-reader.service';

describe('ArtifactReaderService', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), 'artifact-reader-'));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('rejects code file paths that resolve outside the run code directory', async () => {
    const userId = 'user-1';
    const runId = 'run-1';
    const runPath = path.join(tempRoot, userId, 'runs', runId);
    const codePath = path.join(runPath, 'code');
    const siblingPath = path.join(runPath, 'code-other');

    await mkdir(codePath, { recursive: true });
    await mkdir(siblingPath, { recursive: true });
    await writeFile(path.join(siblingPath, 'secret.txt'), 'outside');

    const service = new ArtifactReaderService(
      { findOne: jest.fn() } as never,
      {
        getRunPath: jest.fn().mockReturnValue(runPath),
      } as never,
      {
        getRunLightOrFail: jest.fn().mockResolvedValue({ id: runId }),
      } as never,
    );

    await expect(
      service.getCodeFileContent(runId, '../code-other/secret.txt', userId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns parsed style variants content', async () => {
    const userId = 'user-1';
    const runId = 'run-1';
    const artifactId = 'artifact-1';
    const artifactPath = path.join(userId, 'runs', runId, 'style', 'style-variants.json');
    const absolutePath = path.join(tempRoot, artifactPath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(
      absolutePath,
      JSON.stringify({
        variants: [
          {
            id: 'variant-1',
            name: 'Editorial',
            description: 'Readable landing style',
            visualStyle: 'Editorial',
            colorPalette: ['#111111', '#ffffff'],
            typographyStyle: 'Serif headlines',
            layoutStyle: 'Magazine grid',
            moodKeywords: ['calm', 'premium'],
          },
        ],
      }),
    );

    const service = new ArtifactReaderService(
      {
        findOne: jest.fn().mockResolvedValue({
          id: artifactId,
          runId,
          type: ArtifactType.StyleVariants,
          path: artifactPath,
          mimeType: 'application/json',
        }),
      } as never,
      {
        getGeneratedRootPath: jest.fn().mockReturnValue(tempRoot),
      } as never,
      {
        getRunLightOrFail: jest.fn().mockResolvedValue({ id: runId }),
      } as never,
    );

    await expect(service.getStyleVariantsContent(runId, userId)).resolves.toEqual({
      variants: [
        {
          id: 'variant-1',
          name: 'Editorial',
          description: 'Readable landing style',
          visualStyle: 'Editorial',
          colorPalette: ['#111111', '#ffffff'],
          typographyStyle: 'Serif headlines',
          layoutStyle: 'Magazine grid',
          moodKeywords: ['calm', 'premium'],
        },
      ],
    });
  });

  it('rejects style variants with invalid items', async () => {
    const userId = 'user-1';
    const runId = 'run-1';
    const artifactPath = path.join(userId, 'runs', runId, 'style', 'style-variants.json');
    const absolutePath = path.join(tempRoot, artifactPath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, JSON.stringify({ variants: [null] }));

    const service = new ArtifactReaderService(
      {
        findOne: jest.fn().mockResolvedValue({
          id: 'artifact-1',
          runId,
          type: ArtifactType.StyleVariants,
          path: artifactPath,
          mimeType: 'application/json',
        }),
      } as never,
      {
        getGeneratedRootPath: jest.fn().mockReturnValue(tempRoot),
      } as never,
      {
        getRunLightOrFail: jest.fn().mockResolvedValue({ id: runId }),
      } as never,
    );

    await expect(
      service.getStyleVariantsContent(runId, userId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
