import { IsBoolean } from 'class-validator';

export class UpdateRunPinnedDto {
  @IsBoolean({ message: 'Флаг закрепления должен быть boolean' })
  isPinned!: boolean;
}
