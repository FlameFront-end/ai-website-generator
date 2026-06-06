import { BadRequestException } from '@nestjs/common';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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
});
