import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BriefClarificationAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  question!: string;

  value!: string | string[] | number | boolean;

  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}

export class ClarifyBriefDto {
  @IsString({ message: 'Brief must be a string' })
  @MinLength(3, { message: 'Brief must be at least 3 characters' })
  @MaxLength(10000, { message: 'Brief must not exceed 10000 characters' })
  brief!: string;

  @IsOptional()
  @IsArray()
  answers?: BriefClarificationAnswerDto[];

  @IsOptional()
  @IsString()
  siteLanguage?: string;
}
