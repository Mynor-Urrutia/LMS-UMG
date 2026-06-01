import { IsArray, IsString, Matches, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class ReorderQuizQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(/^c[a-z0-9]{24}$/, { each: true, message: 'Each orderedId must be a valid CUID' })
  orderedIds: string[];
}
