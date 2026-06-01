import { IsString, IsArray, IsInt, IsOptional, Min, Max, ArrayMinSize, ArrayMaxSize, MaxLength } from 'class-validator';

export class UpdateQuizQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  correctOption?: number;
}
