import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DilemmaChoiceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  text!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  consequence!: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  ethicalScore?: number;
}

export class CreateDilemmaDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  scenario!: string;

  @ApiProperty({ type: [DilemmaChoiceDto], minItems: 2, maxItems: 6 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DilemmaChoiceDto)
  choices!: DilemmaChoiceDto[];
}
