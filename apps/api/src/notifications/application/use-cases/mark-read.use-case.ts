import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/ports/notification-repository.port';
import { NotificationEntity } from '../../domain/entities/notification.entity';

@Injectable()
export class MarkReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(notificationId: string, actorId: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== actorId) throw new ForbiddenException('You do not own this notification');
    return this.notificationRepo.markRead(notificationId);
  }
}
