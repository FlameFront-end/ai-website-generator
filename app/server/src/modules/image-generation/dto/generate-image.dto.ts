import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateImageDto {
  @IsString({ message: 'Prompt must be a string' })
  @MinLength(10, { message: 'Prompt must be at least 10 characters' })
  @MaxLength(4000, { message: 'Prompt must not exceed 4000 characters' })
  prompt!: string;
}
