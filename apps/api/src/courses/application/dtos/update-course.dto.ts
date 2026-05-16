import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty } from '../../../common/enums/course-difficulty.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Advanced TypeScript Patterns', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ enum: EnrollmentType })
  @IsOptional()
  @IsEnum(EnrollmentType)
  enrollmentType?: EnrollmentType;

  @ApiPropertyOptional({ example: 'cld7k9e2x0000abc123def456', nullable: true })
  @IsOptional()
  @IsString()
  categoryId?: string | null;
}
