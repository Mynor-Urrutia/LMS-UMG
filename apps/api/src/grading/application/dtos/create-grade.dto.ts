import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateGradeDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}
