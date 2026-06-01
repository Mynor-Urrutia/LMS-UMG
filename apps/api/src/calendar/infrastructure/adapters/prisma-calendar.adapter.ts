import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ICalendarRepository,
  ICreateEventData,
  IUpdateEventData,
  IListEventsFilter,
} from '../../domain/ports/calendar-repository.port';
import { CalendarEventEntity } from '../../domain/entities/calendar-event.entity';

const EVENT_SELECT = {
  id: true,
  courseId: true,
  createdById: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
} as const;

type EventRow = Prisma.CalendarEventGetPayload<{ select: typeof EVENT_SELECT }>;

function toEntity(row: EventRow): CalendarEventEntity {
  return {
    id: row.id,
    courseId: row.courseId,
    createdById: row.createdById,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaCalendarAdapter implements ICalendarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CalendarEventEntity | null> {
    const row = await this.prisma.calendarEvent.findUnique({ where: { id }, select: EVENT_SELECT });
    return row ? toEntity(row) : null;
  }

  async findMany(filter: IListEventsFilter): Promise<CalendarEventEntity[]> {
    const rows = await this.prisma.calendarEvent.findMany({
      where: {
        AND: [
          ...(filter.courseId !== undefined ? [{ courseId: filter.courseId }] : []),
          ...(filter.enrolledCourseIds !== undefined
            ? [{ OR: [{ courseId: { in: filter.enrolledCourseIds } }, { courseId: null }] }]
            : []),
          ...(filter.to ? [{ startsAt: { lte: filter.to } }] : []),
          ...(filter.from
            ? [{ OR: [{ endsAt: { gte: filter.from } }, { endsAt: null }] }]
            : []),
        ],
      },
      select: EVENT_SELECT,
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(toEntity);
  }

  async create(data: ICreateEventData): Promise<CalendarEventEntity> {
    try {
      const row = await this.prisma.calendarEvent.create({
        data: {
          courseId: data.courseId,
          createdById: data.createdById,
          title: data.title,
          description: data.description,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
        },
        select: EVENT_SELECT,
      });
      return toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new NotFoundException('Related entity not found');
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateEventData): Promise<CalendarEventEntity> {
    try {
      const row = await this.prisma.calendarEvent.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
          ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
        },
        select: EVENT_SELECT,
      });
      return toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Event not found');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.calendarEvent.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Event not found');
      }
      throw err;
    }
  }
}
