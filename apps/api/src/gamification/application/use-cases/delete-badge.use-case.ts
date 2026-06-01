import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IBadgeRepository, BADGE_REPOSITORY } from '../../domain/ports/badge-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteBadgeUseCase {
  constructor(@Inject(BADGE_REPOSITORY) private readonly badgeRepo: IBadgeRepository) {}

  async execute(badgeId: string, actorRole: UserRole): Promise<void> {
    if (actorRole !== UserRole.ADMIN) throw new ForbiddenException('Only admins can delete badges');

    const badge = await this.badgeRepo.findById(badgeId);
    if (!badge) throw new NotFoundException('Badge not found');

    await this.badgeRepo.delete(badgeId);
  }
}
