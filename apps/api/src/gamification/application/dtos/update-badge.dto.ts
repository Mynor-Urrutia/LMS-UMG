import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';

export class UpdateBadgeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconPath?: string | null;

  @IsOptional()
  @IsEnum(BadgeCriteria)
  criteriaType?: BadgeCriteria;

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'courseId must be a valid CUID' })
  courseId?: string | null;
}
