import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const CUID_RE = /^c[a-z0-9]{24}$/;

export class UpdateModuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Module that must be completed before this one unlocks. Pass null to remove.' })
  @IsOptional()
  @IsString()
  @Matches(CUID_RE, { message: 'prerequisiteModuleId must be a valid CUID' })
  prerequisiteModuleId?: string | null;
}
