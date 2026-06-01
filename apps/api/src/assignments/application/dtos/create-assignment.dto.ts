import {
  IsString,
  IsEnum,
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
} from 'class-validator';
import { AssignmentType } from '../../../common/enums/assignment-type.enum';

export class CreateAssignmentDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsEnum(AssignmentType)
  type: AssignmentType;

  @IsOptional()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'lessonId must be a valid CUID' })
  lessonId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

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
