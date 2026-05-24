import { IsBoolean } from 'class-validator';

export class UpdateRunPinnedDto {
  @IsBoolean({ message: 'isPinned must be a boolean' })
  isPinned!: boolean;
}
