import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IXpRepository } from '../../domain/ports/xp-repository.port';
import { UserXpEntity } from '../../domain/entities/user-xp.entity';
import { XpTransactionEntity } from '../../domain/entities/xp-transaction.entity';

const USER_XP_SELECT = {
  id: true,
  userId: true,
  totalXp: true,
  updatedAt: true,
} as const;

const XP_TRANSACTION_SELECT = {
  id: true,
  userId: true,
  amount: true,
  reason: true,
  createdAt: true,
} as const;

type UserXpRow = Prisma.UserXpGetPayload<{ select: typeof USER_XP_SELECT }>;
type XpTransactionRow = Prisma.XpTransactionGetPayload<{ select: typeof XP_TRANSACTION_SELECT }>;

function toUserXpEntity(row: UserXpRow): UserXpEntity {
  return { id: row.id, userId: row.userId, totalXp: row.totalXp, updatedAt: row.updatedAt };
}

function toXpTransactionEntity(row: XpTransactionRow): XpTransactionEntity {
  return { id: row.id, userId: row.userId, amount: row.amount, reason: row.reason, createdAt: row.createdAt };
}

@Injectable()
export class PrismaXpAdapter implements IXpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserXp(userId: string): Promise<UserXpEntity | null> {
    const row = await this.prisma.userXp.findUnique({ where: { userId }, select: USER_XP_SELECT });
    return row ? toUserXpEntity(row) : null;
  }

  async addXp(userId: string, amount: number, reason: string): Promise<UserXpEntity> {
    try {
      const [xpRow] = await this.prisma.$transaction([
        this.prisma.userXp.upsert({
          where: { userId },
          create: { userId, totalXp: amount },
          update: { totalXp: { increment: amount } },
          select: USER_XP_SELECT,
        }),
        this.prisma.xpTransaction.create({
          data: { userId, amount, reason },
          select: XP_TRANSACTION_SELECT,
        }),
      ]);
      return toUserXpEntity(xpRow);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async listTransactions(userId: string, limit: number): Promise<XpTransactionEntity[]> {
    const rows = await this.prisma.xpTransaction.findMany({
      where: { userId },
      select: XP_TRANSACTION_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toXpTransactionEntity);
  }
}
