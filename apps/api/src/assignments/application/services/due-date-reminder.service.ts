import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateNotificationUseCase } from '../../../notifications/application/use-cases/create-notification.use-case';
import { NotificationType } from '../../../common/enums/notification-type.enum';

@Injectable()
export class DueDateReminderService {
  private readonly logger = new Logger(DueDateReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  @Cron('0 8 * * *')
  async sendDueSoonReminders(): Promise<void> {
    const base = new Date();
    base.setDate(base.getDate() + 1);
    const from = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
    const to = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);

    const assignments = await this.prisma.assignment.findMany({
      where: { dueDate: { gte: from, lte: to } },
      select: { id: true, title: true, courseId: true },
    });

    if (assignments.length === 0) return;

    let sent = 0;
    for (const assignment of assignments) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseId: assignment.courseId, status: 'ACTIVE' },
        select: { studentId: true },
      });

      for (const { studentId } of enrollments) {
        try {
          await this.createNotification.execute({
            userId: studentId,
            type: NotificationType.ASSIGNMENT_DUE_SOON,
            title: 'Tarea por vencer mañana',
            body: `La tarea "${assignment.title}" vence mañana. No olvides entregar a tiempo.`,
          });
          sent++;
        } catch (err) {
          this.logger.error(`Failed to notify student=${studentId} for assignment=${assignment.id}: ${(err as Error).message}`);
        }
      }
    }

    this.logger.log(`Due-date reminders sent: ${sent} notifications for ${assignments.length} assignments`);
  }
}
