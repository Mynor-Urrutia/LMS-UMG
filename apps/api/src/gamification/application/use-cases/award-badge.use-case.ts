import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY } from '../../domain/ports/badge-repository.port';
import { UserBadgeEntity } from '../../domain/entities/user-badge.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class AwardBadgeUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(userId: string, badgeId: string, actorRole: UserRole): Promise<UserBadgeEntity> {
    if (actorRole !== UserRole.ADMIN) throw new ForbiddenException('Only admins can award badges');

    const badge = await this.badgeRepo.findById(badgeId);
    if (!badge) throw new NotFoundException('Badge not found');

    const existing = await this.badgeRepo.findUserBadge(userId, badgeId);
    if (existing) throw new ConflictException('User already has this badge');

    return this.badgeRepo.awardToUser(userId, badgeId);
  }
}
