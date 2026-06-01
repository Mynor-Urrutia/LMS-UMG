import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { JwtPayload, UserRole } from '../../../common/interfaces/jwt-payload.interface';
import { CreateReviewDto } from '../../application/dtos/create-review.dto';
import { CreateReviewUseCase } from '../../application/use-cases/create-review.use-case';
import { ListReviewsUseCase } from '../../application/use-cases/list-reviews.use-case';
import { DeleteReviewUseCase } from '../../application/use-cases/delete-review.use-case';

@Controller('courses/:courseId/reviews')
export class CourseReviewsController {
  constructor(
    private readonly createReview: CreateReviewUseCase,
    private readonly listReviews: ListReviewsUseCase,
    private readonly deleteReview: DeleteReviewUseCase,
  ) {}

  @Post()
  @Roles(UserRole.STUDENT)
  create(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.createReview.execute({ courseId, studentId: actor.sub, rating: dto.rating, comment: dto.comment });
  }

  @Get()
  @Public()
  list(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Number(page);
    const l = Number(limit);
    return this.listReviews.execute({
      courseId,
      page: Number.isNaN(p) || p < 1 ? 1 : p,
      limit: Number.isNaN(l) || l < 1 ? 20 : Math.min(l, 100),
    });
  }

  @Delete(':reviewId')
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  remove(
    @Param('reviewId', ParseCuidPipe) reviewId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.deleteReview.execute({ reviewId, actorId: actor.sub, actorRole: actor.role });
  }
}
