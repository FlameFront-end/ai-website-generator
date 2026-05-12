import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRunDto {
  @IsOptional()
  @IsString({ message: 'Название запуска должно быть строкой' })
  @MaxLength(80, {
    message: 'Название запуска не должно быть длиннее 80 символов',
  })
  displayName?: string;
}
