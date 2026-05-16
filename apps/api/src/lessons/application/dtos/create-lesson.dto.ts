import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../../common/enums/lesson-type.enum';

export class CreateLessonDto {
  @ApiProperty({ example: 'What is TypeScript?', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ enum: LessonType, default: LessonType.TEXT })
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @ApiPropertyOptional({ description: 'Content for TEXT type lessons (LongText)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Video URL for VIDEO type lessons' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;
}
