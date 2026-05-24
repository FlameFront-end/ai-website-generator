import { IsIn, IsString, MinLength } from 'class-validator';

import type { PipelineStep } from './approve-step.dto';

const PIPELINE_STEPS = ['style', 'reference', 'code', 'final'] as const;

export class EditRequestDto {
  @IsIn(PIPELINE_STEPS, { message: 'Invalid pipeline step' })
  step!: PipelineStep;

  @IsString({ message: 'Instruction must be a string' })
  @MinLength(3, { message: 'Instruction must be at least 3 characters' })
  instruction!: string;
}
