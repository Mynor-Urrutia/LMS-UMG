import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAnnouncementRepository, ANNOUNCEMENT_REPOSITORY } from '../../domain/ports/course-announcement-repository.port';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class DeleteAnnouncementUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly announcementRepo: IAnnouncementRepository,
  ) {}

  async execute(courseId: string, announcementId: string, requesterId: string, requesterRole: UserRole): Promise<void> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const announcement = await this.announcementRepo.findById(announcementId);
    if (!announcement || announcement.courseId !== courseId) throw new NotFoundException('Announcement not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course teacher or an admin can delete announcements');

    await this.announcementRepo.delete(announcementId);
  }
}
