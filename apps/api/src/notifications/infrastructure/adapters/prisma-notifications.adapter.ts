import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { INotificationRepository, ICreateNotificationData } from '../../domain/ports/notification-repository.port';
import { NotificationEntity, NotificationType } from '../../domain/entities/notification.entity';

const NOTIFICATION_SELECT = {
  id: true,
  userId: true,
  type: true,
  title: true,
  body: true,
  isRead: true,
  createdAt: true,
} as const;

type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof NOTIFICATION_SELECT }>;

function toEntity(row: NotificationRow): NotificationEntity {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    isRead: row.isRead,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaNotificationsAdapter implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NotificationEntity | null> {
    const row = await this.prisma.notification.findUnique({ where: { id }, select: NOTIFICATION_SELECT });
    return row ? toEntity(row) : null;
  }

  async findByUser(userId: string, limit: number): Promise<NotificationEntity[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      select: NOTIFICATION_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toEntity);
  }

  async create(data: ICreateNotificationData): Promise<NotificationEntity> {
    const row = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
      },
      select: NOTIFICATION_SELECT,
    });
    return toEntity(row);
  }

  async markRead(id: string): Promise<NotificationEntity> {
    try {
      const row = await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
        select: NOTIFICATION_SELECT,
      });
      return toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Notification not found');
      }
      throw err;
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.notification.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Notification not found');
      }
      throw err;
    }
  }
}
