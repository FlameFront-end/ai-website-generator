import { IsString } from 'class-validator';

export class SelectStyleDto {
  @IsString()
  styleVariantId!: string;
}
