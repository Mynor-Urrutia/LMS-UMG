import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuthUser, IAuthUserRepository, StoredRefreshToken } from '../../domain/ports/user-repository.port';
import { UserRole } from '../../../common/interfaces/jwt-payload.interface';

@Injectable()
export class PrismaUserAdapter implements IAuthUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toAuthUser(user) : null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toAuthUser(user) : null;
  }

  async createUser(email: string, passwordHash: string): Promise<AuthUser> {
    const user = await this.prisma.user.create({
      data: { email, passwordHash },
    });
    return this.toAuthUser(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } }),
      this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
        },
      }),
    ]);
  }

  async findRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!token) return null;
    return { userId: token.userId, expiresAt: token.expiresAt, revokedAt: token.revokedAt };
  }

  async atomicRevokeRefreshToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.prisma.$transaction(async (tx) => {
      const token = await tx.refreshToken.findFirst({
        where: { tokenHash, revokedAt: null },
      });
      if (!token) return null;
      const revokedAt = new Date();
      await tx.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt },
      });
      return { userId: token.userId, expiresAt: token.expiresAt, revokedAt };
    });
  }

  async atomicRotateRefreshToken(
    oldTokenHash: string,
    newTokenHash: string,
    userId: string,
    newExpiresAt: Date,
  ): Promise<StoredRefreshToken | null> {
    return this.prisma.$transaction(async (tx) => {
      const revokedAt = new Date();
      // updateMany is atomic at the DB level — only one concurrent caller gets count=1
      const { count } = await tx.refreshToken.updateMany({
        where: { tokenHash: oldTokenHash, revokedAt: null },
        data: { revokedAt },
      });
      if (count === 0) return null;

      await tx.refreshToken.create({
        data: { userId, tokenHash: newTokenHash, expiresAt: newExpiresAt },
      });
      return { userId, expiresAt: newExpiresAt, revokedAt };
    });
  }

  async revokeRefreshToken(tokenHash: string, userId?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null, ...(userId ? { userId } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private toAuthUser(user: { id: string; email: string; passwordHash: string; role: string; status: string }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      status: user.status,
    };
  }
}
