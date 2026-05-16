import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IModuleRepository, MODULE_REPOSITORY } from '../../domain/ports/course-module-repository.port';
import { CourseModuleEntity } from '../../domain/entities/course-module.entity';
import { CreateModuleDto } from '../dtos/create-module.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class CreateCourseModuleUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
  ) {}

  async execute(
    courseId: string,
    dto: CreateModuleDto,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CourseModuleEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const isAdmin = requesterRole === UserRole.ADMIN;
    const isOwner = course.teacherId === requesterId;
    if (!isOwner && !isAdmin) throw new ForbiddenException('Only the course owner or an admin can add modules');

    const order = (await this.moduleRepo.maxOrder(courseId)) + 1;
    return this.moduleRepo.create({ courseId, title: dto.title, order });
  }
}
