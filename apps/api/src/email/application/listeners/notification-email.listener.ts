import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EMAIL_SERVICE, IEmailService } from '../../domain/ports/email-service.port';
import type { NotificationEntity } from '../../../notifications/domain/entities/notification.entity';

const TYPE_SUBJECTS: Record<string, string> = {
  GRADE_POSTED: 'Calificación publicada',
  BADGE_EARNED: 'Badge ganado',
  ENROLLMENT_APPROVED: 'Inscripción aprobada',
  ENROLLMENT_REJECTED: 'Inscripción rechazada',
  NEW_LESSON: 'Nueva lección disponible',
  ASSIGNMENT_DUE_SOON: 'Tarea por vencer',
  FORUM_REPLY: 'Nueva respuesta en el foro',
  SYSTEM: 'Notificación del sistema',
};

@Injectable()
export class NotificationEmailListener {
  private readonly logger = new Logger(NotificationEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: IEmailService,
  ) {}

  @OnEvent('notification.created', { async: true })
  async handle(notification: NotificationEntity): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true },
      });
      if (!user) return;

      const subject = TYPE_SUBJECTS[notification.type] ?? 'Notificación';
      const html = `
        <p><strong>${notification.title}</strong></p>
        ${notification.body ? `<p>${notification.body}</p>` : ''}
        <hr/>
        <p style="color:#888;font-size:12px">Este es un mensaje automático del LMS.</p>
      `;

      await this.emailService.send({ to: user.email, subject, html });
    } catch (err) {
      this.logger.error(`Error sending notification email: ${(err as Error).message}`);
    }
  }
}
