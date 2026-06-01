import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY } from '../../domain/ports/badge-repository.port';
import { BadgeEntity } from '../../domain/entities/badge.entity';

@Injectable()
export class GetBadgeUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(badgeId: string): Promise<BadgeEntity> {
    const badge = await this.badgeRepo.findById(badgeId);
    if (!badge) throw new NotFoundException('Badge not found');
    return badge;
  }
}
