import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ReferenceBlockBboxDto {
  @IsNumber({}, { message: 'x must be a number' })
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber({}, { message: 'y must be a number' })
  @Min(0)
  @Max(1)
  y!: number;

  @IsNumber({}, { message: 'width must be a number' })
  @Min(0.01)
  @Max(1)
  width!: number;

  @IsNumber({}, { message: 'height must be a number' })
  @Min(0.01)
  @Max(1)
  height!: number;
}

export class EditReferenceBlockDto {
  @IsUUID('4', { message: 'artifactId must be a UUID' })
  artifactId!: string;

  @ValidateNested()
  @Type(() => ReferenceBlockBboxDto)
  bbox!: ReferenceBlockBboxDto;

  @IsString({ message: 'Instruction must be a string' })
  @MinLength(3, { message: 'Instruction must be at least 3 characters' })
  instruction!: string;
}
