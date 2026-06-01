import { IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'courseId must be a valid CUID' })
  courseId?: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
