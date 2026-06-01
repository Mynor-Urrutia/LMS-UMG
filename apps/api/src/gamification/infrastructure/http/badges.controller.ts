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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateBadgeDto } from '../../application/dtos/create-badge.dto';
import { UpdateBadgeDto } from '../../application/dtos/update-badge.dto';
import { CreateBadgeUseCase } from '../../application/use-cases/create-badge.use-case';
import { GetBadgeUseCase } from '../../application/use-cases/get-badge.use-case';
import { ListBadgesUseCase } from '../../application/use-cases/list-badges.use-case';
import { UpdateBadgeUseCase } from '../../application/use-cases/update-badge.use-case';
import { DeleteBadgeUseCase } from '../../application/use-cases/delete-badge.use-case';

@ApiTags('badges')
@Controller('badges')
export class BadgesController {
  constructor(
    private readonly createBadgeUseCase: CreateBadgeUseCase,
    private readonly getBadgeUseCase: GetBadgeUseCase,
    private readonly listBadgesUseCase: ListBadgesUseCase,
    private readonly updateBadgeUseCase: UpdateBadgeUseCase,
    private readonly deleteBadgeUseCase: DeleteBadgeUseCase,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a badge (admin only)' })
  create(@Body() dto: CreateBadgeDto, @CurrentUser() user: JwtPayload) {
    return this.createBadgeUseCase.execute(dto, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List badges (optional filters: courseId, criteriaType)' })
  list(
    @Query('courseId') courseId?: string,
    @Query('criteriaType') criteriaType?: string,
  ) {
    return this.listBadgesUseCase.execute(courseId, criteriaType);
  }

  @Get(':badgeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a badge by ID' })
  getOne(@Param('badgeId', ParseCuidPipe) badgeId: string) {
    return this.getBadgeUseCase.execute(badgeId);
  }

  @Patch(':badgeId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a badge (admin only)' })
  update(
    @Param('badgeId', ParseCuidPipe) badgeId: string,
    @Body() dto: UpdateBadgeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateBadgeUseCase.execute(badgeId, dto, user.role as UserRole);
  }

  @Delete(':badgeId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a badge (admin only)' })
  async remove(@Param('badgeId', ParseCuidPipe) badgeId: string, @CurrentUser() user: JwtPayload) {
    await this.deleteBadgeUseCase.execute(badgeId, user.role as UserRole);
  }
}
