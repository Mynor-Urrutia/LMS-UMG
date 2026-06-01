import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GradeAttemptDto {
  @IsInt()
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
