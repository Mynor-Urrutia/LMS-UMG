import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IXpRepository, XP_REPOSITORY } from '../../domain/ports/xp-repository.port';
import { UserXpEntity } from '../../domain/entities/user-xp.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AwardXpDto } from '../dtos/award-xp.dto';

@Injectable()
export class AwardXpUseCase {
  constructor(@Inject(XP_REPOSITORY) private readonly xpRepo: IXpRepository) {}

  async execute(userId: string, dto: AwardXpDto, actorRole: UserRole): Promise<UserXpEntity> {
    if (actorRole !== UserRole.ADMIN) throw new ForbiddenException('Only admins can award XP');
    return this.xpRepo.addXp(userId, dto.amount, dto.reason);
  }
}
