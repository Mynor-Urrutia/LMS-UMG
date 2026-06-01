import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EMAIL_SERVICE } from './domain/ports/email-service.port';
import { NodemailerEmailAdapter } from './infrastructure/adapters/nodemailer-email.adapter';
import { NotificationEmailListener } from './application/listeners/notification-email.listener';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: EMAIL_SERVICE, useClass: NodemailerEmailAdapter },
    NotificationEmailListener,
  ],
})
export class EmailModule {}
