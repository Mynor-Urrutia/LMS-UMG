import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { IXpRepository, XP_REPOSITORY } from '../../domain/ports/xp-repository.port';
import { XpTransactionEntity } from '../../domain/entities/xp-transaction.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

const DEFAULT_LIMIT = 50;

@Injectable()
export class ListXpTransactionsUseCase {
  constructor(@Inject(XP_REPOSITORY) private readonly xpRepo: IXpRepository) {}

  async execute(
    userId: string,
    actorId: string,
    actorRole: UserRole,
    limit = DEFAULT_LIMIT,
  ): Promise<XpTransactionEntity[]> {
    if (actorRole === UserRole.STUDENT && userId !== actorId) {
      throw new ForbiddenException('You can only view your own XP transactions');
    }
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return this.xpRepo.listTransactions(userId, safeLimit);
  }
}
