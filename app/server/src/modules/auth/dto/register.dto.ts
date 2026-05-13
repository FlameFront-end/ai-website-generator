import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный email' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_400_000, { message: 'Аватар слишком большой' })
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/]+={0,2}$/i, {
    message: 'Некорректный формат аватара',
  })
  avatarUrl?: string;
}
