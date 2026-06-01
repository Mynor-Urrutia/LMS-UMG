import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../domain/ports/lesson-repository.port';
import { LessonEntity } from '../../domain/entities/lesson.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ListLessonsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<LessonEntity[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const mod = await this.moduleRepo.findById(moduleId);
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');

    const lessons = await this.lessonRepo.findByModule(moduleId);

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;

    if (requesterRole === UserRole.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { courseId, studentId: requesterId, status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] } },
        select: { id: true },
      });
      if (!enrollment) throw new ForbiddenException('You are not enrolled in this course');
    }

    // Owners and admins see all lessons; everyone else sees only published ones
    if (isOwner || isAdmin) return lessons;
    return lessons.filter((l) => l.isPublished);
  }
}
