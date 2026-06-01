import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CALENDAR_REPOSITORY, ICalendarRepository } from '../../domain/ports/calendar-repository.port';
import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdateEventDto } from '../dtos/update-event.dto';

@Injectable()
export class UpdateEventUseCase {
  constructor(@Inject(CALENDAR_REPOSITORY) private readonly calendarRepo: ICalendarRepository) {}

  async execute(eventId: string, dto: UpdateEventDto, actorId: string, actorRole: UserRole): Promise<CalendarEventEntity> {
    const event = await this.calendarRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    if (actorRole !== UserRole.ADMIN && event.createdById !== actorId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : event.startsAt;
    const endsAt = dto.endsAt !== undefined
      ? (dto.endsAt ? new Date(dto.endsAt) : null)
      : event.endsAt;

    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.calendarRepo.update(eventId, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.startsAt !== undefined && { startsAt }),
      ...(dto.endsAt !== undefined && { endsAt }),
    });
  }
}
