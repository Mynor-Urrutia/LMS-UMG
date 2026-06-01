import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAnnouncementRepository, ANNOUNCEMENT_REPOSITORY } from '../../domain/ports/course-announcement-repository.port';
import { CourseAnnouncementEntity } from '../../domain/entities/course-announcement.entity';
import { CreateAnnouncementDto } from '../dtos/create-announcement.dto';
import { UserRole } from '../../../common/enums/user-role.enum';
import { sanitizeRichText } from '../../../common/utils/sanitize';

@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly announcementRepo: IAnnouncementRepository,
  ) {}

  async execute(
    courseId: string,
    dto: CreateAnnouncementDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CourseAnnouncementEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course teacher or an admin can post announcements');

    return this.announcementRepo.create({
      courseId,
      authorId: requesterId,
      title: dto.title,
      content: sanitizeRichText(dto.content),
    });
  }
}
