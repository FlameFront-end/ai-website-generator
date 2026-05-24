import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateRunDto {
  @IsString({ message: 'Brief must be a string' })
  @MinLength(10, { message: 'Brief must be at least 10 characters' })
  @MaxLength(10000, { message: 'Brief must not exceed 10000 characters' })
  brief!: string;

  @IsOptional()
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(80, {
    message: 'Display name must not exceed 80 characters',
  })
  displayName?: string;
}
