import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCustomRoleDto } from './create-custom-role.dto';

export class UpdateCustomRoleDto extends PartialType(OmitType(CreateCustomRoleDto, ['baseRole'] as const)) {}
