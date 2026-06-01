import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class AwardXpDto {
  @IsInt()
  @Min(1)
  @Max(10_000)
  amount: number;

  @IsString()
  @MaxLength(255)
  reason: string;
}
