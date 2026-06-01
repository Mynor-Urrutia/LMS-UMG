import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BadgeCriteria } from '../../../common/enums/badge-criteria.enum';
import { NotificationType } from '../../../common/enums/notification-type.enum';
import { getLevelFromXp } from '../../../common/utils/xp-levels';

export interface CourseCompletedEvent  { studentId: string; courseId: string; }
export interface EnrollmentCreatedEvent { studentId: string; courseId: string; }
export interface EvaluationPerfectEvent { studentId: string; courseId: string; evaluationId: string; }

const XP_REWARDS: Record<BadgeCriteria, number> = {
  [BadgeCriteria.COURSE_COMPLETE]:  100,
  [BadgeCriteria.PERFECT_QUIZ]:      50,
  [BadgeCriteria.FIRST_ENROLLMENT]:  20,
  [BadgeCriteria.STREAK]:            30,
  [BadgeCriteria.MANUAL]:             0,
  [BadgeCriteria.LEVEL_UP]:           0,
};

@Injectable()
export class GamificationEventListener {
  private readonly logger = new Logger(GamificationEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Handlers ────────────────────────────────────────────────────────────────

  @OnEvent('course.completed', { async: true })
  async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    try {
      await this.autoAward(event.studentId, BadgeCriteria.COURSE_COMPLETE, event.courseId);
      await this.grantXp(event.studentId, XP_REWARDS[BadgeCriteria.COURSE_COMPLETE], 'Curso completado');
    } catch (err) {
      this.logger.error(`Gamification error on course.completed: ${(err as Error).message}`);
    }
  }

  @OnEvent('enrollment.created', { async: true })
  async onEnrollmentCreated(event: EnrollmentCreatedEvent): Promise<void> {
    try {
      const count = await this.prisma.enrollment.count({ where: { studentId: event.studentId } });
      if (count === 1) {
        await this.autoAward(event.studentId, BadgeCriteria.FIRST_ENROLLMENT);
        await this.grantXp(event.studentId, XP_REWARDS[BadgeCriteria.FIRST_ENROLLMENT], 'Primera inscripción en un curso');
      }
    } catch (err) {
      this.logger.error(`Gamification error on enrollment.created: ${(err as Error).message}`);
    }
  }

  @OnEvent('evaluation.perfect', { async: true })
  async onPerfectScore(event: EvaluationPerfectEvent): Promise<void> {
    try {
      await this.autoAward(event.studentId, BadgeCriteria.PERFECT_QUIZ, event.courseId);
      await this.grantXp(event.studentId, XP_REWARDS[BadgeCriteria.PERFECT_QUIZ], 'Puntaje perfecto en evaluación');
    } catch (err) {
      this.logger.error(`Gamification error on evaluation.perfect: ${(err as Error).message}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async autoAward(userId: string, criteria: BadgeCriteria, courseId?: string): Promise<void> {
    // Find all badges matching the criteria — global badges (courseId null) + course-specific if provided
    const badges = await this.prisma.badge.findMany({
      where: {
        criteriaType: criteria,
        OR: [
          { courseId: null },
          ...(courseId ? [{ courseId }] : []),
        ],
      },
    });

    for (const badge of badges) {
      const existing = await this.prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId: badge.id } },
      });
      if (existing) continue;

      await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });

      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.BADGE_EARNED,
          title: `¡Obtuviste el badge "${badge.name}"!`,
          body: badge.description ?? null,
          isRead: false,
        },
      });

      this.eventEmitter.emit('notification.created', notification);
      this.logger.log(`Badge "${badge.name}" auto-awarded to user=${userId}`);
    }
  }

  private async grantXp(userId: string, amount: number, reason: string): Promise<void> {
    if (amount <= 0) return;

    const before = await this.prisma.userXp.findUnique({ where: { userId }, select: { totalXp: true } });
    const xpBefore = before?.totalXp ?? 0;

    await this.prisma.$transaction([
      this.prisma.xpTransaction.create({ data: { userId, amount, reason } }),
      this.prisma.userXp.upsert({
        where: { userId },
        create: { userId, totalXp: amount },
        update: { totalXp: { increment: amount } },
      }),
    ]);

    const xpAfter = xpBefore + amount;
    const levelBefore = getLevelFromXp(xpBefore);
    const levelAfter = getLevelFromXp(xpAfter);

    if (levelAfter > levelBefore) {
      await this.autoAward(userId, BadgeCriteria.LEVEL_UP);
      this.logger.log(`User=${userId} leveled up: ${levelBefore} → ${levelAfter}`);
    }

    this.logger.log(`Granted ${amount} XP to user=${userId} — ${reason}`);
  }
}
