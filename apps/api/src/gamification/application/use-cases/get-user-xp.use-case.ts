import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IXpRepository, XP_REPOSITORY } from '../../domain/ports/xp-repository.port';
import { UserXpEntity } from '../../domain/entities/user-xp.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class GetUserXpUseCase {
  constructor(@Inject(XP_REPOSITORY) private readonly xpRepo: IXpRepository) {}

  async execute(userId: string, actorId: string, actorRole: UserRole): Promise<UserXpEntity | null> {
    if (actorRole === UserRole.STUDENT && userId !== actorId) {
      throw new ForbiddenException('You can only view your own XP');
    }
    return this.xpRepo.getUserXp(userId);
  }
}
