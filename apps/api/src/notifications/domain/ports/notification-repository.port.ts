import { NotificationType } from '../../../common/enums/notification-type.enum';
import { NotificationEntity } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface ICreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
}

export interface INotificationRepository {
  findById(id: string): Promise<NotificationEntity | null>;
  findByUser(userId: string, limit: number): Promise<NotificationEntity[]>;
  create(data: ICreateNotificationData): Promise<NotificationEntity>;
  markRead(id: string): Promise<NotificationEntity>;
  markAllRead(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
}
