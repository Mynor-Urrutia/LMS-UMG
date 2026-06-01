import { Inject, Injectable } from '@nestjs/common';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/ports/notification-repository.port';
import { NotificationEntity } from '../../domain/entities/notification.entity';

const DEFAULT_LIMIT = 50;

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(userId: string, limit = DEFAULT_LIMIT): Promise<NotificationEntity[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return this.notificationRepo.findByUser(userId, safeLimit);
  }
}
