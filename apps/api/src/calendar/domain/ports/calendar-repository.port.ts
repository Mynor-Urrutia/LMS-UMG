import { CalendarEventEntity } from '../entities/calendar-event.entity';

export const CALENDAR_REPOSITORY = 'CALENDAR_REPOSITORY';

export interface ICreateEventData {
  courseId: string | null;
  createdById: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
}

export interface IUpdateEventData {
  title?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date | null;
}

export interface IListEventsFilter {
  courseId?: string;
  from?: Date;
  to?: Date;
  enrolledCourseIds?: string[];
}

export interface ICalendarRepository {
  findById(id: string): Promise<CalendarEventEntity | null>;
  findMany(filter: IListEventsFilter): Promise<CalendarEventEntity[]>;
  create(data: ICreateEventData): Promise<CalendarEventEntity>;
  update(id: string, data: IUpdateEventData): Promise<CalendarEventEntity>;
  delete(id: string): Promise<void>;
}
