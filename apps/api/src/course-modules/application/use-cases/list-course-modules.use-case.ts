import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../domain/ports/course-module-repository.port';
import { CourseModuleWithLessons } from '../../domain/entities/course-module.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CourseStatus } from '../../../common/enums/course-status.enum';

@Injectable()
export class ListCourseModulesUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
  ) {}

  async execute(
    courseId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CourseModuleWithLessons[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;

    if (course.status !== CourseStatus.PUBLISHED && !isOwner && !isAdmin) {
      throw new NotFoundException('Course not found');
    }

    return this.moduleRepo.findByCourse(courseId);
  }
}
