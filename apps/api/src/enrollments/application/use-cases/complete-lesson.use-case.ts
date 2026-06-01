import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../../course-modules/domain/ports/course-module-repository.port';
import { ILessonRepository, LESSON_REPOSITORY } from '../../../lessons/domain/ports/lesson-repository.port';
import { IEnrollmentRepository, ENROLLMENT_REPOSITORY } from '../../domain/ports/enrollment-repository.port';
import { ILessonProgressRepository, LESSON_PROGRESS_REPOSITORY } from '../../domain/ports/lesson-progress-repository.port';
import { EnrollmentStatus } from '../../domain/entities/enrollment.entity';

export interface LessonCompletionResult {
  progress: number;
  completedLessons: number;
  totalLessons: number;
}

@Injectable()
export class CompleteLessonUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
    @Inject(LESSON_PROGRESS_REPOSITORY) private readonly lessonProgressRepo: ILessonProgressRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    courseId: string,
    moduleId: string,
    lessonId: string,
    studentId: string,
  ): Promise<LessonCompletionResult> {
    const [course, mod, lesson, enrollment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.moduleRepo.findById(moduleId),
      this.lessonRepo.findById(lessonId),
      this.enrollmentRepo.findByStudentAndCourse(studentId, courseId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!mod || mod.courseId !== courseId) throw new NotFoundException('Module not found');
    if (!lesson || lesson.moduleId !== moduleId) throw new NotFoundException('Lesson not found');

    if (mod.prerequisiteModuleId) {
      const prereqCompleted = await this.moduleRepo.isModuleCompletedByStudent(mod.prerequisiteModuleId, studentId);
      if (!prereqCompleted) {
        throw new ForbiddenException('You must complete the previous module before accessing this one');
      }
    }

    if (!lesson.isPublished) {
      throw new UnprocessableEntityException('Cannot complete an unpublished lesson');
    }

    if (!enrollment || (enrollment.status !== EnrollmentStatus.ACTIVE && enrollment.status !== EnrollmentStatus.COMPLETED)) {
      throw new ForbiddenException('An active enrollment is required to complete lessons');
    }

    // If course is already completed, return current state without re-processing
    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      const [totalLessons, completedLessons] = await Promise.all([
        this.lessonRepo.countPublished(courseId),
        this.lessonProgressRepo.countCompleted(studentId, courseId),
      ]);
      const clamped = Math.min(completedLessons, totalLessons);
      return { progress: 100, completedLessons: clamped, totalLessons };
    }

    await this.lessonProgressRepo.upsert(studentId, lessonId);

    const [totalLessons, completedLessons] = await Promise.all([
      this.lessonRepo.countPublished(courseId),
      this.lessonProgressRepo.countCompleted(studentId, courseId),
    ]);

    // Defensive clamp: guards against adapter drift where completedLessons could exceed totalLessons
    const clampedCompleted = Math.min(completedLessons, totalLessons);
    const progress = totalLessons === 0 ? 0 : Math.round((clampedCompleted / totalLessons) * 100);

    if (progress === 100) {
      await this.enrollmentRepo.updateStatus(enrollment.id, EnrollmentStatus.COMPLETED);
      this.eventEmitter.emit('course.completed', { studentId, courseId });
    }

    return { progress, completedLessons: clampedCompleted, totalLessons };
  }
}
