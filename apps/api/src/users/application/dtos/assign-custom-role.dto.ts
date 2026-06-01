import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCustomRoleDto {
  @ApiPropertyOptional({ description: 'Custom role ID, or null to unassign' })
  @IsOptional()
  @IsString()
  customRoleId?: string | null;
}
