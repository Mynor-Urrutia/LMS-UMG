import { IsString, IsArray, IsInt, Min, Max, ArrayMinSize, ArrayMaxSize, MaxLength } from 'class-validator';

export class CreateQuizQuestionDto {
  @IsString()
  @MaxLength(2000)
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  options: string[];

  @IsInt()
  @Min(0)
  @Max(5)
  correctOption: number;
}
