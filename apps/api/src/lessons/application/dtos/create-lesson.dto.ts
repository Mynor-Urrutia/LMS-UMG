import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';
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

  @ApiProperty({ enum: LessonType })
  @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional({ description: 'Required for TEXT type lessons' })
  @ValidateIf((o) => o.type === LessonType.TEXT)
  @IsString()
  @IsNotEmpty()
  content?: string;

  @ApiPropertyOptional({ description: 'Required for VIDEO type lessons' })
  @ValidateIf((o) => o.type === LessonType.VIDEO)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsNotEmpty()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Required for FILE type lessons — ID returned by POST /files' })
  @ValidateIf((o) => o.type === LessonType.FILE)
  @IsString()
  @IsNotEmpty()
  fileAssetId?: string;

  @ApiPropertyOptional({ description: 'Required for EMBED type lessons — URL of the app to embed (YouTube, Mentimeter, H5P, etc.)' })
  @ValidateIf((o) => o.type === LessonType.EMBED)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsNotEmpty()
  embedUrl?: string;
}
