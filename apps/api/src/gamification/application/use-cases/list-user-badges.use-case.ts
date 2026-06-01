import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY } from '../../domain/ports/badge-repository.port';
import { UserBadgeEntity } from '../../domain/entities/user-badge.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ListUserBadgesUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(userId: string, actorId: string, actorRole: UserRole): Promise<UserBadgeEntity[]> {
    if (actorRole === UserRole.STUDENT && userId !== actorId) {
      throw new ForbiddenException('You can only view your own badges');
    }
    return this.badgeRepo.listUserBadges(userId);
  }
}
