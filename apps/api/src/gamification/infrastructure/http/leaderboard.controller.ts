import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { getLevelFromXp } from '../../../common/utils/xp-levels';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Top users by XP (global leaderboard)' })
  async getLeaderboard(@Query('limit') limit?: string) {
    const n = limit !== undefined ? parseInt(limit, 10) : NaN;
    const take = Number.isNaN(n) || n < 1 || n > 50 ? 10 : n;

    const rows = await this.prisma.userXp.findMany({
      take,
      orderBy: { totalXp: 'desc' },
      select: {
        totalXp: true,
        user: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.user.id,
      firstName: r.user.profile?.firstName ?? null,
      lastName: r.user.profile?.lastName ?? null,
      totalXp: r.totalXp,
      level: getLevelFromXp(r.totalXp),
    }));
  }
}
