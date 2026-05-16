import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/ports/course-repository.port';
import { CourseEntity, CourseStatus } from '../../domain/entities/course.entity';
import { UpdateCourseDto } from '../dtos/update-course.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class UpdateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(
    id: string,
    dto: UpdateCourseDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CourseEntity> {
    const course = await this.courseRepo.findById(id);
    if (!course) throw new NotFoundException('Course not found');

    const isOwner = course.teacherId === requesterId;
    const isAdmin = requesterRole === UserRole.ADMIN;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can update this course');

    if (course.status === CourseStatus.ARCHIVED) {
      throw new UnprocessableEntityException('Archived courses cannot be updated');
    }

    const hasChanges =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.difficulty !== undefined ||
      dto.enrollmentType !== undefined ||
      dto.categoryId !== undefined;

    if (!hasChanges) return course;

    return this.courseRepo.update(id, {
      title: dto.title,
      description: dto.description,
      difficulty: dto.difficulty,
      enrollmentType: dto.enrollmentType,
      categoryId: dto.categoryId,
    });
  }
}
