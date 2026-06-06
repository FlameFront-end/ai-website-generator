import { RunStatus } from '../../common/enums';
import { getPipelineStepMetadata } from './pipeline-step';

describe('pipeline step metadata', () => {
  it('keeps style awaiting currentStep compatible with the client contract', () => {
    const metadata = getPipelineStepMetadata('style');

    expect(metadata.awaitingStatus).toBe(RunStatus.AwaitingStyleSelection);
    expect(metadata.awaitingCurrentStep).toBe('awaiting_style_selection');
  });
});
