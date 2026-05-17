import { IsIn, IsString, MinLength } from 'class-validator';

import type { PipelineStep } from './approve-step.dto';

const PIPELINE_STEPS = ['style', 'reference', 'code', 'final'] as const;

export class EditRequestDto {
  @IsIn(PIPELINE_STEPS, { message: 'Некорректный шаг пайплайна' })
  step!: PipelineStep;

  @IsString({ message: 'Инструкция должна быть строкой' })
  @MinLength(3, { message: 'Инструкция должна содержать минимум 3 символа' })
  instruction!: string;
}
