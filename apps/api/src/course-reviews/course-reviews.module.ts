import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { CoursesModule } from '../courses/courses.module';
import { COURSE_REVIEW_REPOSITORY } from './domain/ports/course-review-repository.port';
import { PrismaCourseReviewsAdapter } from './infrastructure/adapters/prisma-course-reviews.adapter';
import { CreateReviewUseCase } from './application/use-cases/create-review.use-case';
import { ListReviewsUseCase } from './application/use-cases/list-reviews.use-case';
import { DeleteReviewUseCase } from './application/use-cases/delete-review.use-case';
import { CourseReviewsController } from './infrastructure/http/course-reviews.controller';

@Module({
  imports: [PrismaModule, EnrollmentsModule, CoursesModule],
  controllers: [CourseReviewsController],
  providers: [
    { provide: COURSE_REVIEW_REPOSITORY, useClass: PrismaCourseReviewsAdapter },
    CreateReviewUseCase,
    ListReviewsUseCase,
    DeleteReviewUseCase,
  ],
})
export class CourseReviewsModule {}
