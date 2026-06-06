import { RunStatus } from '../../common/enums';
import type { RunEntity } from '../../db/entities';
import { PipelineService } from './pipeline.service';

describe('PipelineService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not start a second pipeline task for an already active run', async () => {
    const styleStep = {
      generateStyleVariantsStep: jest.fn().mockResolvedValue(undefined),
    };
    const state = {
      failRun: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      {} as never,
      {} as never,
      {} as never,
      styleStep as never,
      {} as never,
      {} as never,
    );
    const run = {
      id: 'run-1',
      status: RunStatus.Queued,
    } as RunEntity;

    service.processRun(run, 'user-1');
    service.processRun(run, 'user-1');

    await jest.advanceTimersByTimeAsync(1200);

    expect(styleStep.generateStyleVariantsStep).toHaveBeenCalledTimes(1);
  });

  it('does not update status when rebuild is requested for an already active run', async () => {
    const state = {
      updateRunStatus: jest.fn().mockResolvedValue({ id: 'run-1' }),
    };
    const codegenStep = {
      runBuildAndQA: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      {} as never,
      {} as never,
      {} as never,
      { generateStyleVariantsStep: jest.fn() } as never,
      {} as never,
      codegenStep as never,
    );
    const run = {
      id: 'run-1',
      status: RunStatus.Queued,
    } as RunEntity;

    service.processRun(run, 'user-1');
    const isScheduled = await service.rebuildRun(run, 'user-1');

    expect(isScheduled).toBe(false);
    expect(state.updateRunStatus).not.toHaveBeenCalled();
    expect(codegenStep.runBuildAndQA).not.toHaveBeenCalled();
  });

  it('does not report rebuild as scheduled when the state transition fails', async () => {
    const state = {
      updateRunStatus: jest.fn().mockRejectedValue(new Error('database unavailable')),
    };
    const codegenStep = {
      runBuildAndQA: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      codegenStep as never,
    );
    const run = {
      id: 'run-1',
      status: RunStatus.Completed,
    } as RunEntity;

    const isScheduled = await service.rebuildRun(run, 'user-1');

    expect(isScheduled).toBe(false);
    expect(codegenStep.runBuildAndQA).not.toHaveBeenCalled();
  });

  it('uses explicit restart state transition so a stopped run can restart', async () => {
    jest.useRealTimers();
    const state = {
      startRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      addLog: jest.fn().mockResolvedValue(undefined),
      updateRunStatus: jest.fn().mockResolvedValue({ id: 'run-1' }),
      failRun: jest.fn().mockResolvedValue(undefined),
    };
    const styleStep = {
      regenerateStyle: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      { getRunAbsolutePath: jest.fn().mockReturnValue('/tmp/run/style') } as never,
      { remove: jest.fn().mockResolvedValue(undefined) } as never,
      { deleteArtifactsByType: jest.fn().mockResolvedValue(undefined) } as never,
      styleStep as never,
      {} as never,
      {} as never,
    );
    const run = {
      id: 'run-1',
      status: RunStatus.Failed,
      errorMessage: 'PIPELINE_STOPPED: Step stopped by user',
    } as RunEntity;

    await service.restartStep(run, 'style', 'user-1');
    await new Promise((resolve) => setImmediate(resolve));

    expect(state.startRun).toHaveBeenCalledWith(
      run,
      'generate_style_variants',
      'user-1',
    );
    expect(styleStep.regenerateStyle).toHaveBeenCalledTimes(1);
  });

  it('reports restart scheduling failure when the state transition fails', async () => {
    const state = {
      startRun: jest.fn().mockRejectedValue(new Error('database unavailable')),
      addLog: jest.fn().mockResolvedValue(undefined),
      failRun: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      {} as never,
      {} as never,
      {} as never,
      { regenerateStyle: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    const run = {
      id: 'run-1',
      status: RunStatus.Failed,
    } as RunEntity;

    const isScheduled = await service.restartStep(run, 'style', 'user-1');

    expect(isScheduled).toBe(false);
  });

  it('reserves a run before restarting a step', async () => {
    const run = {
      id: 'run-1',
      status: RunStatus.Failed,
      errorMessage: 'PIPELINE_STOPPED: Step stopped by user',
    } as RunEntity;
    const styleStep = {
      generateStyleVariantsStep: jest.fn().mockResolvedValue(undefined),
      regenerateStyle: jest.fn().mockResolvedValue(undefined),
    };
    const state = {
      startRun: jest.fn().mockImplementation(async () => {
        service.processRun(run, 'user-1');
        return run;
      }),
      addLog: jest.fn().mockResolvedValue(undefined),
      updateRunStatus: jest.fn().mockResolvedValue(run),
      failRun: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      { getRunAbsolutePath: jest.fn().mockReturnValue('/tmp/run/style') } as never,
      { remove: jest.fn().mockResolvedValue(undefined) } as never,
      { deleteArtifactsByType: jest.fn().mockResolvedValue(undefined) } as never,
      styleStep as never,
      {} as never,
      {} as never,
    );

    const isScheduled = await service.restartStep(run, 'style', 'user-1');

    expect(isScheduled).toBe(true);
    expect(styleStep.generateStyleVariantsStep).not.toHaveBeenCalled();
  });

  it('reports that restart was not scheduled when the run is already active', async () => {
    const state = {
      updateRunStatus: jest.fn().mockResolvedValue({ id: 'run-1' }),
      startRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      failRun: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PipelineService(
      state as never,
      {} as never,
      {} as never,
      {} as never,
      { generateStyleVariantsStep: jest.fn() } as never,
      {} as never,
      {} as never,
    );
    const run = {
      id: 'run-1',
      status: RunStatus.Failed,
    } as RunEntity;

    service.processRun(run, 'user-1');
    const isScheduled = await service.restartStep(run, 'style', 'user-1');

    expect(isScheduled).toBe(false);
    expect(state.startRun).not.toHaveBeenCalled();
  });
});
