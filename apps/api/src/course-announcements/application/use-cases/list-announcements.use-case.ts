import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAnnouncementRepository, ANNOUNCEMENT_REPOSITORY } from '../../domain/ports/course-announcement-repository.port';
import { CourseAnnouncementEntity } from '../../domain/entities/course-announcement.entity';

@Injectable()
export class ListAnnouncementsUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly announcementRepo: IAnnouncementRepository,
  ) {}

  async execute(courseId: string): Promise<CourseAnnouncementEntity[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    return this.announcementRepo.findByCourse(courseId);
  }
}
