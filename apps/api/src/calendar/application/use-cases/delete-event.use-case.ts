import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CALENDAR_REPOSITORY, ICalendarRepository } from '../../domain/ports/calendar-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteEventUseCase {
  constructor(@Inject(CALENDAR_REPOSITORY) private readonly calendarRepo: ICalendarRepository) {}

  async execute(eventId: string, actorId: string, actorRole: UserRole): Promise<void> {
    const event = await this.calendarRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (actorRole !== UserRole.ADMIN && event.createdById !== actorId) {
      throw new ForbiddenException('You can only delete your own events');
    }
    await this.calendarRepo.delete(eventId);
  }
}
