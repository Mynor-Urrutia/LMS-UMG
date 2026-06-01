import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { AwardXpDto } from '../../application/dtos/award-xp.dto';
import { AwardBadgeUseCase } from '../../application/use-cases/award-badge.use-case';
import { ListUserBadgesUseCase } from '../../application/use-cases/list-user-badges.use-case';
import { AwardXpUseCase } from '../../application/use-cases/award-xp.use-case';
import { GetUserXpUseCase } from '../../application/use-cases/get-user-xp.use-case';
import { ListXpTransactionsUseCase } from '../../application/use-cases/list-xp-transactions.use-case';

@ApiTags('user-gamification')
@Controller('users/:userId')
export class UserGamificationController {
  constructor(
    private readonly awardBadgeUseCase: AwardBadgeUseCase,
    private readonly listUserBadgesUseCase: ListUserBadgesUseCase,
    private readonly awardXpUseCase: AwardXpUseCase,
    private readonly getUserXpUseCase: GetUserXpUseCase,
    private readonly listXpTransactionsUseCase: ListXpTransactionsUseCase,
  ) {}

  @Post('badges/:badgeId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Award a badge to a user (admin only)' })
  awardBadge(
    @Param('userId', ParseCuidPipe) userId: string,
    @Param('badgeId', ParseCuidPipe) badgeId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.awardBadgeUseCase.execute(userId, badgeId, user.role as UserRole);
  }

  @Get('badges')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a user's earned badges (own badges or admin/teacher view)" })
  listBadges(
    @Param('userId', ParseCuidPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listUserBadgesUseCase.execute(userId, user.sub, user.role as UserRole);
  }

  @Post('xp')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Award XP to a user (admin only)' })
  awardXp(
    @Param('userId', ParseCuidPipe) userId: string,
    @Body() dto: AwardXpDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.awardXpUseCase.execute(userId, dto, user.role as UserRole);
  }

  @Get('xp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a user's XP balance (own or admin/teacher view)" })
  async getXp(
    @Param('userId', ParseCuidPipe) userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const xp = await this.getUserXpUseCase.execute(userId, user.sub, user.role as UserRole);
    return xp ?? { userId, totalXp: 0 };
  }

  @Get('xp/transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a user's XP transaction history" })
  listTransactions(
    @Param('userId', ParseCuidPipe) userId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const n = limit !== undefined ? parseInt(limit, 10) : NaN;
    const parsedLimit = Number.isNaN(n) || n < 1 ? undefined : n;
    return this.listXpTransactionsUseCase.execute(
      userId,
      user.sub,
      user.role as UserRole,
      parsedLimit,
    );
  }
}
