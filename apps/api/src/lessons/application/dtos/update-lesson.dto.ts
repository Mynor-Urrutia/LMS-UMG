import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';
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
  @ValidateIf((o) => o.content !== null)
  @IsString()
  @IsNotEmpty()
  content?: string | null;

  @ApiPropertyOptional({ description: 'null clears the video URL' })
  @IsOptional()
  @ValidateIf((o) => o.videoUrl !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  videoUrl?: string | null;

  @ApiPropertyOptional({ description: 'null clears the file asset ID' })
  @IsOptional()
  @ValidateIf((o) => o.fileAssetId !== null)
  @IsString()
  @IsNotEmpty()
  fileAssetId?: string | null;

  @ApiPropertyOptional({ description: 'null clears the file path' })
  @IsOptional()
  @ValidateIf((o) => o.filePath !== null)
  @IsString()
  @IsNotEmpty()
  filePath?: string | null;

  @ApiPropertyOptional({ description: 'null clears the embed URL' })
  @IsOptional()
  @ValidateIf((o) => o.embedUrl !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  embedUrl?: string | null;
}
