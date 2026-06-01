import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IBadgeRepository,
  ICreateBadgeData,
  IUpdateBadgeData,
  IBadgeFilters,
} from '../../domain/ports/badge-repository.port';
import { BadgeEntity } from '../../domain/entities/badge.entity';
import { UserBadgeEntity } from '../../domain/entities/user-badge.entity';
import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';

const BADGE_SELECT = {
  id: true,
  courseId: true,
  name: true,
  description: true,
  iconPath: true,
  criteriaType: true,
  createdAt: true,
} as const;

const USER_BADGE_SELECT = {
  id: true,
  userId: true,
  badgeId: true,
  awardedAt: true,
  badge: { select: BADGE_SELECT },
} as const;

type BadgeRow = Prisma.BadgeGetPayload<{ select: typeof BADGE_SELECT }>;
type UserBadgeRow = Prisma.UserBadgeGetPayload<{ select: typeof USER_BADGE_SELECT }>;

function toBadgeEntity(row: BadgeRow): BadgeEntity {
  return {
    id: row.id,
    courseId: row.courseId,
    name: row.name,
    description: row.description,
    iconPath: row.iconPath,
    criteriaType: row.criteriaType as BadgeCriteria,
    createdAt: row.createdAt,
  };
}

function toUserBadgeEntity(row: UserBadgeRow): UserBadgeEntity {
  return {
    id: row.id,
    userId: row.userId,
    badgeId: row.badgeId,
    awardedAt: row.awardedAt,
    badge: toBadgeEntity(row.badge),
  };
}

@Injectable()
export class PrismaBadgesAdapter implements IBadgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BadgeEntity | null> {
    const row = await this.prisma.badge.findUnique({ where: { id }, select: BADGE_SELECT });
    return row ? toBadgeEntity(row) : null;
  }

  async findAll(filters?: IBadgeFilters): Promise<BadgeEntity[]> {
    const rows = await this.prisma.badge.findMany({
      where: {
        ...(filters?.courseId !== undefined && { courseId: filters.courseId }),
        ...(filters?.criteriaType !== undefined && { criteriaType: filters.criteriaType }),
      },
      select: BADGE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toBadgeEntity);
  }

  async create(data: ICreateBadgeData): Promise<BadgeEntity> {
    try {
      const row = await this.prisma.badge.create({
        data: {
          courseId: data.courseId,
          name: data.name,
          description: data.description,
          iconPath: data.iconPath,
          criteriaType: data.criteriaType,
        },
        select: BADGE_SELECT,
      });
      return toBadgeEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new NotFoundException('Course not found');
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateBadgeData): Promise<BadgeEntity> {
    try {
      const row = await this.prisma.badge.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.iconPath !== undefined && { iconPath: data.iconPath }),
          ...(data.criteriaType !== undefined && { criteriaType: data.criteriaType }),
          ...(data.courseId !== undefined && { courseId: data.courseId }),
        },
        select: BADGE_SELECT,
      });
      return toBadgeEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') throw new NotFoundException('Badge not found');
        if (err.code === 'P2003') throw new NotFoundException('Course not found');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.badge.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Badge not found');
      }
      throw err;
    }
  }

  async findUserBadge(userId: string, badgeId: string): Promise<UserBadgeEntity | null> {
    const row = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
      select: USER_BADGE_SELECT,
    });
    return row ? toUserBadgeEntity(row) : null;
  }

  async awardToUser(userId: string, badgeId: string): Promise<UserBadgeEntity> {
    try {
      const row = await this.prisma.userBadge.create({
        data: { userId, badgeId },
        select: USER_BADGE_SELECT,
      });
      return toUserBadgeEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') throw new ConflictException('User already has this badge');
        if (err.code === 'P2003') throw new NotFoundException('User or badge not found');
      }
      throw err;
    }
  }

  async listUserBadges(userId: string): Promise<UserBadgeEntity[]> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId },
      select: USER_BADGE_SELECT,
      orderBy: { awardedAt: 'desc' },
    });
    return rows.map(toUserBadgeEntity);
  }
}
