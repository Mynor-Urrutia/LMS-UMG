import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdateProfileDto } from '../../application/dtos/update-profile.dto';
import { ChangeRoleDto } from '../../application/dtos/change-role.dto';
import { ChangeStatusDto } from '../../application/dtos/change-status.dto';
import { ListUsersDto } from '../../application/dtos/list-users.dto';
import { GetProfileUseCase } from '../../application/use-cases/get-profile.use-case';
import { UpdateProfileUseCase } from '../../application/use-cases/update-profile.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { ChangeUserRoleUseCase } from '../../application/use-cases/change-user-role.use-case';
import { ChangeUserStatusUseCase } from '../../application/use-cases/change-user-status.use-case';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly changeUserRoleUseCase: ChangeUserRoleUseCase,
    private readonly changeUserStatusUseCase: ChangeUserStatusUseCase,
  ) {}

  // Static routes MUST be declared before ':id' — NestJS resolves in declaration order
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.getProfileUseCase.execute(user.sub);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.updateProfileUseCase.execute(user.sub, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all users (admin only)' })
  listAllUsers(@Query() dto: ListUsersDto) {
    return this.listUsersUseCase.execute(dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  getUserById(@Param('id') id: string) {
    return this.getProfileUseCase.execute(id);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change user role (admin only)' })
  async changeUserRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    await this.changeUserRoleUseCase.execute(admin.sub, id, dto.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change user status (admin only)' })
  async changeUserStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    await this.changeUserStatusUseCase.execute(admin.sub, id, dto.status);
  }
}
