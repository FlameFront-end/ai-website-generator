import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateImageDto {
  @IsString({ message: 'Prompt должен быть строкой' })
  @MinLength(10, { message: 'Prompt должен содержать минимум 10 символов' })
  @MaxLength(4000, { message: 'Prompt не должен быть длиннее 4000 символов' })
  prompt!: string;
}
