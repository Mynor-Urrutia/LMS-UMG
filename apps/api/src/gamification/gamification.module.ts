import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BADGE_REPOSITORY } from './domain/ports/badge-repository.port';
import { XP_REPOSITORY } from './domain/ports/xp-repository.port';
import { PrismaBadgesAdapter } from './infrastructure/adapters/prisma-badges.adapter';
import { PrismaXpAdapter } from './infrastructure/adapters/prisma-xp.adapter';
import { CreateBadgeUseCase } from './application/use-cases/create-badge.use-case';
import { GetBadgeUseCase } from './application/use-cases/get-badge.use-case';
import { ListBadgesUseCase } from './application/use-cases/list-badges.use-case';
import { UpdateBadgeUseCase } from './application/use-cases/update-badge.use-case';
import { DeleteBadgeUseCase } from './application/use-cases/delete-badge.use-case';
import { AwardBadgeUseCase } from './application/use-cases/award-badge.use-case';
import { ListUserBadgesUseCase } from './application/use-cases/list-user-badges.use-case';
import { AwardXpUseCase } from './application/use-cases/award-xp.use-case';
import { GetUserXpUseCase } from './application/use-cases/get-user-xp.use-case';
import { ListXpTransactionsUseCase } from './application/use-cases/list-xp-transactions.use-case';
import { GamificationEventListener } from './application/listeners/gamification-event.listener';
import { BadgesController } from './infrastructure/http/badges.controller';
import { UserGamificationController } from './infrastructure/http/user-gamification.controller';
import { LeaderboardController } from './infrastructure/http/leaderboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BadgesController, UserGamificationController, LeaderboardController],
  providers: [
    { provide: BADGE_REPOSITORY, useClass: PrismaBadgesAdapter },
    { provide: XP_REPOSITORY, useClass: PrismaXpAdapter },
    CreateBadgeUseCase,
    GetBadgeUseCase,
    ListBadgesUseCase,
    UpdateBadgeUseCase,
    DeleteBadgeUseCase,
    AwardBadgeUseCase,
    ListUserBadgesUseCase,
    AwardXpUseCase,
    GetUserXpUseCase,
    ListXpTransactionsUseCase,
    GamificationEventListener,
  ],
  exports: [AwardBadgeUseCase, AwardXpUseCase],
})
export class GamificationModule {}
