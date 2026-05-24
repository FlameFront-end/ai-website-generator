import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRunDto {
  @IsOptional()
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(80, {
    message: 'Display name must not exceed 80 characters',
  })
  displayName?: string;
}
