import { Injectable } from '@nestjs/common';
import { Prisma, Role, UserStatus as PrismaUserStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IUserRepository,
  ListUsersFilter,
  PaginatedUsers,
  ProfileData,
} from '../../domain/ports/user-repository.port';
import { UserEntity, UserProfile, UserRole, UserStatus } from '../../domain/entities/user.entity';

// passwordHash excluded at query level — safety is structural, not incidental
const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  status: true,
  customRoleId: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      carnet: true,
      avatarPath: true,
      bio: true,
      gradeId: true,
      sectionId: true,
      departmentId: true,
      grade: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
} as const;

// Derived from USER_SELECT so type and query shape can never drift apart
type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class PrismaUsersAdapter implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    return user ? this.toEntity(user) : null;
  }

  async listUsers(filter: ListUsersFilter): Promise<PaginatedUsers> {
    const where: Prisma.UserWhereInput = {};

    if (filter.role) where.role = filter.role as Role;
    if (filter.status) where.status = filter.status as PrismaUserStatus;

    if (filter.search) {
      // Case-sensitivity depends on MySQL collation (utf8mb4_unicode_ci = insensitive by default)
      const term = filter.search;
      where.OR = [
        { email: { contains: term } },
        { profile: { firstName: { contains: term } } },
        { profile: { lastName: { contains: term } } },
        { profile: { carnet: { contains: term } } },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: filter.limit,
        // Secondary sort on id guarantees stable pagination when createdAt ties (e.g. seeded data)
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: (users as UserRow[]).map((u) => this.toEntity(u)),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async upsertProfile(userId: string, data: ProfileData): Promise<UserEntity> {
    return this.prisma.$transaction(async (tx) => {
      await tx.profile.upsert({
        where: { userId },
        create: {
          userId,
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          bio: data.bio ?? null,
          carnet: data.carnet ?? null,
          gradeId: data.gradeId ?? null,
          sectionId: data.sectionId ?? null,
          departmentId: data.departmentId ?? null,
        },
        update: {
          ...(data.firstName !== undefined && { firstName: data.firstName }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.carnet !== undefined && { carnet: data.carnet }),
          ...(data.gradeId !== undefined && { gradeId: data.gradeId }),
          ...(data.sectionId !== undefined && { sectionId: data.sectionId }),
          ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        },
      });
      const user = await tx.user.findUnique({ where: { id: userId }, select: USER_SELECT });
      return this.toEntity(user as UserRow);
    });
  }

  async atomicChangeRole(userId: string, newRole: UserRole): Promise<'ok' | 'last-admin-blocked'> {
    // Serializable isolation prevents the TOCTOU race where two concurrent demotions
    // both read adminCount=2, both pass the guard, and both succeed leaving zero admins
    return this.prisma.$transaction(
      async (tx) => {
        const current = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });

        if (current?.role === 'ADMIN' && newRole !== UserRole.ADMIN) {
          const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
          if (adminCount <= 1) return 'last-admin-blocked';
        }

        await tx.user.update({ where: { id: userId }, data: { role: newRole as Role } });
        return 'ok';
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async changeStatus(userId: string, status: UserStatus): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: status as PrismaUserStatus },
    });
  }

  async assignCustomRole(userId: string, customRoleId: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { customRoleId },
    });
  }

  private toEntity(user: UserRow): UserEntity {
    const profile: UserProfile | null = user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          carnet: user.profile.carnet,
          avatarPath: user.profile.avatarPath,
          bio: user.profile.bio,
          gradeId: user.profile.gradeId,
          sectionId: user.profile.sectionId,
          departmentId: user.profile.departmentId,
          grade: user.profile.grade ?? null,
          section: user.profile.section ?? null,
          department: user.profile.department ?? null,
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role as unknown as UserRole,
      status: user.status as unknown as UserStatus,
      customRoleId: user.customRoleId ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile,
    };
  }
}
