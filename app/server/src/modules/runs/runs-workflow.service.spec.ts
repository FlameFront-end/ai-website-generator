import { RunStatus } from '../../common/enums';
import type { RunEntity } from '../../db/entities';
import { RunsWorkflowService } from './runs-workflow.service';

describe('RunsWorkflowService', () => {
  it('logs rebuild acceptance only after scheduling succeeds', async () => {
    const run = {
      id: 'run-1',
      status: RunStatus.Completed,
    } as RunEntity;
    const crud = {
      getRunLightOrFail: jest.fn().mockResolvedValue(run),
      addLog: jest.fn().mockResolvedValue(undefined),
    };
    const pipelineService = {
      rebuildRun: jest.fn().mockReturnValue(false),
    };
    const service = new RunsWorkflowService(
      {} as never,
      {} as never,
      pipelineService as never,
      crud as never,
    );

    const result = await service.rebuildRun('run-1', 'user-1');

    expect(result).toEqual({ id: 'run-1', status: RunStatus.Completed });
    expect(crud.addLog).not.toHaveBeenCalledWith(run.id, 'Rebuild started');
  });

  it('logs restart acceptance only after scheduling succeeds', async () => {
    const run = {
      id: 'run-1',
      status: RunStatus.Failed,
      currentStep: 'build_project',
    } as RunEntity;
    const crud = {
      getRunLightOrFail: jest.fn().mockResolvedValue(run),
      addLog: jest.fn().mockResolvedValue(undefined),
    };
    const pipelineService = {
      restartStep: jest.fn().mockResolvedValue(false),
    };
    const service = new RunsWorkflowService(
      { findOne: jest.fn().mockResolvedValue(run) } as never,
      {} as never,
      pipelineService as never,
      crud as never,
    );

    const result = await service.restartCurrentStep('run-1', 'user-1');

    expect(result).toEqual({ id: 'run-1', status: RunStatus.Failed });
    expect(crud.addLog).not.toHaveBeenCalledWith(
      run.id,
      'Step restart request accepted: Code',
    );
  });
});
