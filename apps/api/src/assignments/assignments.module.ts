import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ASSIGNMENT_REPOSITORY } from './domain/ports/assignment-repository.port';
import { PrismaAssignmentsAdapter } from './infrastructure/adapters/prisma-assignments.adapter';
import { CreateAssignmentUseCase } from './application/use-cases/create-assignment.use-case';
import { GetAssignmentUseCase } from './application/use-cases/get-assignment.use-case';
import { ListAssignmentsUseCase } from './application/use-cases/list-assignments.use-case';
import { UpdateAssignmentUseCase } from './application/use-cases/update-assignment.use-case';
import { DeleteAssignmentUseCase } from './application/use-cases/delete-assignment.use-case';
import { AddQuizQuestionUseCase } from './application/use-cases/add-quiz-question.use-case';
import { ListQuizQuestionsUseCase } from './application/use-cases/list-quiz-questions.use-case';
import { UpdateQuizQuestionUseCase } from './application/use-cases/update-quiz-question.use-case';
import { DeleteQuizQuestionUseCase } from './application/use-cases/delete-quiz-question.use-case';
import { ReorderQuizQuestionsUseCase } from './application/use-cases/reorder-quiz-questions.use-case';
import { CreateDilemmaUseCase } from './application/use-cases/create-dilemma.use-case';
import { GetDilemmaUseCase } from './application/use-cases/get-dilemma.use-case';
import { DueDateReminderService } from './application/services/due-date-reminder.service';
import { AssignmentsController } from './infrastructure/http/assignments.controller';

@Module({
  imports: [PrismaModule, CoursesModule, EnrollmentsModule, NotificationsModule],
  controllers: [AssignmentsController],
  providers: [
    { provide: ASSIGNMENT_REPOSITORY, useClass: PrismaAssignmentsAdapter },
    CreateAssignmentUseCase,
    GetAssignmentUseCase,
    ListAssignmentsUseCase,
    UpdateAssignmentUseCase,
    DeleteAssignmentUseCase,
    AddQuizQuestionUseCase,
    ListQuizQuestionsUseCase,
    UpdateQuizQuestionUseCase,
    DeleteQuizQuestionUseCase,
    ReorderQuizQuestionsUseCase,
    CreateDilemmaUseCase,
    GetDilemmaUseCase,
    DueDateReminderService,
  ],
  exports: [ASSIGNMENT_REPOSITORY],
})
export class AssignmentsModule {}
