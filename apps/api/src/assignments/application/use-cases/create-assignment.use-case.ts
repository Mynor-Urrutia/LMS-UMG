import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { AssignmentEntity, AssignmentType } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateAssignmentDto } from '../dtos/create-assignment.dto';

@Injectable()
export class CreateAssignmentUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, dto: CreateAssignmentDto, actorId: string, actorRole: UserRole): Promise<AssignmentEntity> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (dto.dueDate !== undefined && dto.dueDate !== null) {
      const due = new Date(dto.dueDate);
      if (isNaN(due.getTime())) throw new BadRequestException('dueDate is not a valid date');
      if (due <= new Date(Date.now() + 60_000)) throw new BadRequestException('dueDate must be at least 1 minute in the future');
    }

    // Cross-course lessonId validation: we cannot cheaply verify lesson.module.courseId === courseId
    // without adding a module-repo dependency. The @IsCuid() DTO guard + P2003 catch in the adapter
    // (FK constraint on lessonId) is the pragmatic safety net.
    return this.assignmentRepo.create({
      courseId,
      lessonId: dto.lessonId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type as AssignmentType,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      allowLate: dto.allowLate ?? true,
      maxScore: dto.maxScore ?? 100,
      weight: dto.weight ?? 1.0,
    });
  }
}
