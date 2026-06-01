import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { CALENDAR_REPOSITORY, ICalendarRepository } from '../../domain/ports/calendar-repository.port';
import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateEventDto } from '../dtos/create-event.dto';

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(CALENDAR_REPOSITORY) private readonly calendarRepo: ICalendarRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(dto: CreateEventDto, actorId: string, actorRole: UserRole): Promise<CalendarEventEntity> {
    if (actorRole !== UserRole.TEACHER && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only teachers and admins can create events');
    }

    if (dto.courseId) {
      const course = await this.courseRepo.findById(dto.courseId);
      if (!course) throw new NotFoundException('Course not found');
      if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
        throw new ForbiddenException('You do not teach this course');
      }
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.calendarRepo.create({
      courseId: dto.courseId ?? null,
      createdById: actorId,
      title: dto.title,
      description: dto.description ?? null,
      startsAt,
      endsAt,
    });
  }
}
