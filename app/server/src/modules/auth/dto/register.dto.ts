import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_400_000, { message: 'Avatar is too large' })
  @Matches(/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/]+={0,2}$/i, {
    message: 'Invalid avatar format',
  })
  avatarUrl?: string;
}
