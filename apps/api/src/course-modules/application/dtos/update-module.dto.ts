import { PickType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';

export class UpdateModuleDto extends PickType(CreateModuleDto, ['title'] as const) {}
