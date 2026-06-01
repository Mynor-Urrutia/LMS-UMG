import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CALENDAR_REPOSITORY } from './domain/ports/calendar-repository.port';
import { PrismaCalendarAdapter } from './infrastructure/adapters/prisma-calendar.adapter';
import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case';
import { GetEventUseCase } from './application/use-cases/get-event.use-case';
import { UpdateEventUseCase } from './application/use-cases/update-event.use-case';
import { DeleteEventUseCase } from './application/use-cases/delete-event.use-case';
import { CalendarController } from './infrastructure/http/calendar.controller';

@Module({
  imports: [PrismaModule, CoursesModule, EnrollmentsModule],
  controllers: [CalendarController],
  providers: [
    { provide: CALENDAR_REPOSITORY, useClass: PrismaCalendarAdapter },
    CreateEventUseCase,
    ListEventsUseCase,
    GetEventUseCase,
    UpdateEventUseCase,
    DeleteEventUseCase,
  ],
})
export class CalendarModule {}
