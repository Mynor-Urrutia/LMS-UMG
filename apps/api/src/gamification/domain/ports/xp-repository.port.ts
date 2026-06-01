import { UserXpEntity } from '../entities/user-xp.entity';
import { XpTransactionEntity } from '../entities/xp-transaction.entity';

export const XP_REPOSITORY = 'XP_REPOSITORY';

export interface IXpRepository {
  getUserXp(userId: string): Promise<UserXpEntity | null>;
  addXp(userId: string, amount: number, reason: string): Promise<UserXpEntity>;
  listTransactions(userId: string, limit: number): Promise<XpTransactionEntity[]>;
}
