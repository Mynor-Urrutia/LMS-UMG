import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SettableUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class ChangeStatusDto {
  @ApiProperty({ enum: SettableUserStatus })
  @IsEnum(SettableUserStatus)
  status: SettableUserStatus;
}
