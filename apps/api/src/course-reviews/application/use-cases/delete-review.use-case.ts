import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseReviewRepository, COURSE_REVIEW_REPOSITORY } from '../../domain/ports/course-review-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

export interface IDeleteReviewInput {
  reviewId: string;
  actorId: string;
  actorRole: UserRole;
}

@Injectable()
export class DeleteReviewUseCase {
  constructor(
    @Inject(COURSE_REVIEW_REPOSITORY) private readonly reviewRepo: ICourseReviewRepository,
  ) {}

  async execute(input: IDeleteReviewInput): Promise<void> {
    const review = await this.reviewRepo.findById(input.reviewId);
    if (!review) throw new NotFoundException('Review not found');

    if (input.actorRole !== UserRole.ADMIN && review.studentId !== input.actorId) {
      throw new ForbiddenException('You can only delete your own review');
    }

    await this.reviewRepo.delete(input.reviewId);
  }
}
