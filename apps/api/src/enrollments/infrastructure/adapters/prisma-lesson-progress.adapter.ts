import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ILessonProgressRepository } from '../../domain/ports/lesson-progress-repository.port';

@Injectable()
export class PrismaLessonProgressAdapter implements ILessonProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(studentId: string, lessonId: string): Promise<void> {
    await this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      create: { studentId, lessonId, completedAt: new Date() },
      update: {}, // idempotent — completedAt is set only on first creation; update: {} is load-bearing
    });
  }

  async countCompleted(studentId: string, courseId: string): Promise<number> {
    return this.prisma.lessonProgress.count({
      where: {
        studentId,
        lesson: { isPublished: true, module: { courseId } },
      },
    });
  }
}
