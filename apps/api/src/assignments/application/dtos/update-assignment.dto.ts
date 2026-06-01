import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  Matches,
  Min,
  Max,
  IsDateString,
  MaxLength,
  IsPositive,
  ValidateIf,
} from 'class-validator';

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.lessonId !== null)
  @Matches(/^c[a-z0-9]{24}$/, { message: 'lessonId must be a valid CUID' })
  lessonId?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.dueDate !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsBoolean()
  allowLate?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(10000)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  weight?: number;
}
