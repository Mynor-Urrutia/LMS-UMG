import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLessonDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'null clears the content' })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({ description: 'null clears the video URL' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string | null;
}
