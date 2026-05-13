import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateRunDto {
  @IsString({ message: 'Бриф должен быть строкой' })
  @MinLength(10, { message: 'Бриф должен содержать минимум 10 символов' })
  @MaxLength(10000, { message: 'Бриф не должен быть длиннее 10000 символов' })
  brief!: string;

  @IsOptional()
  @IsString({ message: 'Название проекта должно быть строкой' })
  @MaxLength(80, {
    message: 'Название проекта не должно быть длиннее 80 символов',
  })
  displayName?: string;
}
