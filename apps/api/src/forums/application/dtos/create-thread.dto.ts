import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;
}
