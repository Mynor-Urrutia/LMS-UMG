import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../../domain/ports/notification-repository.port';
import { NotificationEntity, NotificationType } from '../../domain/entities/notification.entity';

export interface ICreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
}

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: ICreateNotificationInput): Promise<NotificationEntity> {
    const notification = await this.notificationRepo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
    });
    this.eventEmitter.emit('notification.created', notification);
    return notification;
  }
}
