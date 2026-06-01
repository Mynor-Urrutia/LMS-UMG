import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NOTIFICATION_REPOSITORY } from './domain/ports/notification-repository.port';
import { PrismaNotificationsAdapter } from './infrastructure/adapters/prisma-notifications.adapter';
import { CreateNotificationUseCase } from './application/use-cases/create-notification.use-case';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { MarkReadUseCase } from './application/use-cases/mark-read.use-case';
import { MarkAllReadUseCase } from './application/use-cases/mark-all-read.use-case';
import { DeleteNotificationUseCase } from './application/use-cases/delete-notification.use-case';
import { NotificationsController } from './infrastructure/http/notifications.controller';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationsAdapter },
    CreateNotificationUseCase,
    ListNotificationsUseCase,
    MarkReadUseCase,
    MarkAllReadUseCase,
    DeleteNotificationUseCase,
  ],
  exports: [CreateNotificationUseCase],
})
export class NotificationsModule {}
