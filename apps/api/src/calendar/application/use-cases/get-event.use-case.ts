import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CALENDAR_REPOSITORY, ICalendarRepository } from '../../domain/ports/calendar-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class GetEventUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY) private readonly calendarRepo: ICalendarRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async execute(eventId: string, actorId: string, actorRole: UserRole): Promise<CalendarEventEntity> {
    const event = await this.calendarRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    if (actorRole === UserRole.STUDENT && event.courseId !== null) {
      const enrollment = await this.enrollmentRepo.findByStudentAndCourse(actorId, event.courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You are not enrolled in this course');
      }
    }

    return event;
  }
}
