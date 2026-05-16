import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
