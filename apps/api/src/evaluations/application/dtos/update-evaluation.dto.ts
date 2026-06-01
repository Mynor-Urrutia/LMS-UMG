import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateEvaluationDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsInt() @Min(1) totalPoints?: number;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
