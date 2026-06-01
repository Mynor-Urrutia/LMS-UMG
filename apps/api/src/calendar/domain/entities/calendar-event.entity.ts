export interface CalendarEventEntity {
  id: string;
  courseId: string | null;
  createdById: string | null;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
}
