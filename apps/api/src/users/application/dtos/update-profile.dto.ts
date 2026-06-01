import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ maxLength: 50, description: 'Student/Teacher ID card number' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  carnet?: string;

  @ApiPropertyOptional({ description: 'Academic grade ID' })
  @IsOptional()
  @IsString()
  gradeId?: string | null;

  @ApiPropertyOptional({ description: 'Academic section ID' })
  @IsOptional()
  @IsString()
  sectionId?: string | null;

  @ApiPropertyOptional({ description: 'Academic department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  bio?: string;
}
