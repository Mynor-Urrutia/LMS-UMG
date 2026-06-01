import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SurveyQuestionType } from '../../../common/enums/survey-question-type.enum';

export class CreateSurveyQuestionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  text!: string;

  @ApiProperty({ enum: SurveyQuestionType })
  @IsEnum(SurveyQuestionType)
  type!: SurveyQuestionType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateSurveyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiProperty({ type: [CreateSurveyQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyQuestionDto)
  questions!: CreateSurveyQuestionDto[];
}
