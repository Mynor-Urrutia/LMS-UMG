import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseReviewRepository, COURSE_REVIEW_REPOSITORY, ListReviewsResult } from '../../domain/ports/course-review-repository.port';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';

export interface IListReviewsInput {
  courseId: string;
  page: number;
  limit: number;
}

@Injectable()
export class ListReviewsUseCase {
  constructor(
    @Inject(COURSE_REVIEW_REPOSITORY) private readonly reviewRepo: ICourseReviewRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(input: IListReviewsInput): Promise<ListReviewsResult> {
    const course = await this.courseRepo.findById(input.courseId);
    if (!course) throw new NotFoundException('Course not found');

    return this.reviewRepo.listByCourse(input.courseId, input.page, input.limit);
  }
}
