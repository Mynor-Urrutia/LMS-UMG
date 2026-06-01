import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';

export class CreateBadgeDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconPath?: string;

  @IsEnum(BadgeCriteria)
  criteriaType: BadgeCriteria;

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'courseId must be a valid CUID' })
  courseId?: string;
}
