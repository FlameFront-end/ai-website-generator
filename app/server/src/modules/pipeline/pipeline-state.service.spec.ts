import { RunStatus } from '../../common/enums';
import type { RunEntity } from '../../db/entities';
import { PipelineStateService } from './pipeline-state.service';

describe('PipelineStateService', () => {
  it('does not overwrite a user-stopped run through normal status updates', async () => {
    const stoppedRun = {
      id: 'run-1',
      status: RunStatus.Failed,
      errorMessage: 'PIPELINE_STOPPED: Step stopped by user',
    } as RunEntity;
    const runsRepository = {
      findOne: jest.fn().mockResolvedValue(stoppedRun),
      update: jest.fn(),
    };
    const service = new PipelineStateService(
      runsRepository as never,
      {} as never,
      { writeStatusFile: jest.fn() } as never,
    );

    const result = await service.updateRunStatus(
      stoppedRun,
      RunStatus.Completed,
      'completed',
      'user-1',
    );

    expect(result).toBe(stoppedRun);
    expect(runsRepository.update).not.toHaveBeenCalled();
  });

  it('clears a stopped marker when explicitly starting a run', async () => {
    const stoppedRun = {
      id: 'run-1',
      status: RunStatus.Failed,
      errorMessage: 'PIPELINE_STOPPED: Step stopped by user',
    } as RunEntity;
    const runningRun = {
      ...stoppedRun,
      status: RunStatus.Running,
      currentStep: 'generate_style_variants',
      errorMessage: null,
    } as RunEntity;
    const runsRepository = {
      findOne: jest.fn().mockResolvedValue(runningRun),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const storageService = {
      writeStatusFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineStateService(
      runsRepository as never,
      {} as never,
      storageService as never,
    );

    const result = await service.startRun(
      stoppedRun,
      'generate_style_variants',
      'user-1',
    );

    expect(runsRepository.update).toHaveBeenCalledWith(stoppedRun.id, {
      status: RunStatus.Running,
      currentStep: 'generate_style_variants',
      errorMessage: null,
    });
    expect(storageService.writeStatusFile).toHaveBeenCalledWith(
      'user-1',
      stoppedRun.id,
      runningRun,
    );
    expect(result).toBe(runningRun);
  });

  it('writes the status file when stopping a run', async () => {
    const stoppedRun = {
      id: 'run-1',
      status: RunStatus.Failed,
      errorMessage: 'PIPELINE_STOPPED: Step stopped by user',
    } as RunEntity;
    const runsRepository = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(stoppedRun),
    };
    const storageService = {
      writeStatusFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineStateService(
      runsRepository as never,
      { addLog: jest.fn().mockResolvedValue(undefined) } as never,
      storageService as never,
    );

    await service.stopRunById('run-1', 'Step stopped by user', 'user-1');

    expect(storageService.writeStatusFile).toHaveBeenCalledWith(
      'user-1',
      'run-1',
      stoppedRun,
    );
  });

  it('writes the status file with the persisted user id when stopping a run without explicit user id', async () => {
    const stoppedRun = {
      id: 'run-1',
      userId: 'user-1',
      status: RunStatus.Failed,
      errorMessage: 'PIPELINE_STOPPED: Server is shutting down',
    } as RunEntity;
    const runsRepository = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(stoppedRun),
    };
    const storageService = {
      writeStatusFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineStateService(
      runsRepository as never,
      { addLog: jest.fn().mockResolvedValue(undefined) } as never,
      storageService as never,
    );

    await service.stopRunById('run-1', 'Server is shutting down');

    expect(storageService.writeStatusFile).toHaveBeenCalledWith(
      'user-1',
      'run-1',
      stoppedRun,
    );
  });
});
