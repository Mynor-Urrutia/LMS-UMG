import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderLessonsDto {
  @ApiProperty({ type: [String], description: 'Complete ordered list of lesson IDs for the module' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(/^c[a-z0-9]{24}$/, { each: true, message: 'Each ID must be a valid CUID' })
  ids: string[];
}
