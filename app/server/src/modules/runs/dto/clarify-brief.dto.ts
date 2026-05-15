import {
  IsArray,
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
}

export class ClarifyBriefDto {
  @IsString({ message: 'Бриф должен быть строкой' })
  @MinLength(3, { message: 'Бриф должен содержать минимум 3 символа' })
  @MaxLength(10000, { message: 'Бриф не должен быть длиннее 10000 символов' })
  brief!: string;

  @IsOptional()
  @IsArray()
  answers?: BriefClarificationAnswerDto[];

  @IsOptional()
  @IsString()
  siteLanguage?: string;
}
