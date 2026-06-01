import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  textAnswer?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedIds?: string[] | null;
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
