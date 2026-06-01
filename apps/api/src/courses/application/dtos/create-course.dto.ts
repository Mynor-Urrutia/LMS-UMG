import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDifficulty } from '../../../common/enums/course-difficulty.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';

export class CreateCourseDto {
  @ApiProperty({ description: 'CUID of the teacher to assign this course to' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ example: 'Introduction to TypeScript', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Learn TypeScript from scratch.', maxLength: 5000 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: CourseDifficulty, default: CourseDifficulty.BEGINNER })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ enum: EnrollmentType, default: EnrollmentType.OPEN })
  @IsOptional()
  @IsEnum(EnrollmentType)
  enrollmentType?: EnrollmentType;

  @ApiPropertyOptional({ example: 'cld7k9e2x0000abc123def456' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
