import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CALENDAR_REPOSITORY, ICalendarRepository } from '../../domain/ports/calendar-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

const CUID_RE = /^c[a-z0-9]{24}$/;

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY) private readonly calendarRepo: ICalendarRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(actorId: string, actorRole: UserRole, courseId?: string, from?: string, to?: string): Promise<CalendarEventEntity[]> {
    if (courseId !== undefined && !CUID_RE.test(courseId)) {
      throw new BadRequestException('courseId must be a valid CUID');
    }
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if (fromDate && isNaN(fromDate.getTime())) throw new BadRequestException('from must be a valid ISO date');
    if (toDate && isNaN(toDate.getTime())) throw new BadRequestException('to must be a valid ISO date');

    if (actorRole === UserRole.STUDENT) {
      if (courseId !== undefined) {
        const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, courseId);
        if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
          throw new ForbiddenException('You are not enrolled in this course');
        }
        return this.calendarRepo.findMany({ courseId, from: fromDate, to: toDate });
      }
      const enrollments = await this.enrollmentRepo.findByStudent(actorId);
      const enrolledCourseIds = enrollments
        .filter(e => e.status === EnrollmentStatus.ACTIVE)
        .map(e => e.courseId);
      return this.calendarRepo.findMany({ enrolledCourseIds, from: fromDate, to: toDate });
    }

    return this.calendarRepo.findMany({ courseId, from: fromDate, to: toDate });
  }
}
