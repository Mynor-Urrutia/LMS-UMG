import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
