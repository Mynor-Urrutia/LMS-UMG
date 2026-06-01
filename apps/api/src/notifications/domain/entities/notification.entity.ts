import { NotificationType } from '../../../common/enums/notification-type.enum';

export { NotificationType };

export interface NotificationEntity {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: Date;
}
