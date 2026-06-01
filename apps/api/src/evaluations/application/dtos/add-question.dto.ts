import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class AddQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string;

  @IsEnum(['TEXT', 'MCQ', 'TRUE_FALSE'])
  type: 'TEXT' | 'MCQ' | 'TRUE_FALSE';

  @IsInt()
  @Min(1)
  points: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}
