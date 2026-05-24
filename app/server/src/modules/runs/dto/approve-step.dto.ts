import { IsIn } from 'class-validator';

const PIPELINE_STEPS = ['style', 'reference', 'code', 'final'] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export class ApproveStepDto {
  @IsIn(PIPELINE_STEPS, { message: 'Invalid pipeline step' })
  step!: PipelineStep;
}
