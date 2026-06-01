import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateCustomRoleDto } from '../../application/dtos/create-custom-role.dto';
import { UpdateCustomRoleDto } from '../../application/dtos/update-custom-role.dto';
import { ListCustomRolesUseCase } from '../../application/use-cases/list-custom-roles.use-case';
import { ListPermissionsUseCase } from '../../application/use-cases/list-permissions.use-case';
import { CreateCustomRoleUseCase } from '../../application/use-cases/create-custom-role.use-case';
import { UpdateCustomRoleUseCase } from '../../application/use-cases/update-custom-role.use-case';
import { DeleteCustomRoleUseCase } from '../../application/use-cases/delete-custom-role.use-case';

@ApiTags('custom-roles')
@Controller('custom-roles')
@Roles(UserRole.ADMIN)
export class CustomRolesController {
  constructor(
    private readonly listCustomRolesUseCase: ListCustomRolesUseCase,
    private readonly listPermissionsUseCase: ListPermissionsUseCase,
    private readonly createCustomRoleUseCase: CreateCustomRoleUseCase,
    private readonly updateCustomRoleUseCase: UpdateCustomRoleUseCase,
    private readonly deleteCustomRoleUseCase: DeleteCustomRoleUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all custom roles' })
  listAll() {
    return this.listCustomRolesUseCase.execute();
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all available permissions' })
  listPermissions() {
    return this.listPermissionsUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() dto: CreateCustomRoleDto) {
    return this.createCustomRoleUseCase.execute(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a custom role' })
  update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateCustomRoleDto,
  ) {
    return this.updateCustomRoleUseCase.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role (non-system only)' })
  async delete(@Param('id', ParseCuidPipe) id: string) {
    await this.deleteCustomRoleUseCase.execute(id);
  }
}
