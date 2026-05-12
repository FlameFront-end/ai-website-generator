import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateRunDto {
  @IsString({ message: 'Бриф должен быть строкой' })
  @MinLength(10, { message: 'Бриф должен содержать минимум 10 символов' })
  @MaxLength(10000, { message: 'Бриф не должен быть длиннее 10000 символов' })
  brief!: string;
}
