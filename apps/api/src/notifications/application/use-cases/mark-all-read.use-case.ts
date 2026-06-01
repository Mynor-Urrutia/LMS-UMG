import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/ports/notification-repository.port';

@Injectable()
export class MarkAllReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(userId: string, actorId: string): Promise<void> {
    if (userId !== actorId) throw new ForbiddenException('You can only mark your own notifications as read');
    await this.notificationRepo.markAllRead(userId);
  }
}
