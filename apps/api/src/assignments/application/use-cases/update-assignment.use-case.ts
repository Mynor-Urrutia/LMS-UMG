import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../domain/ports/assignment-repository.port';
import { AssignmentEntity } from '../../domain/entities/assignment.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdateAssignmentDto } from '../dtos/update-assignment.dto';

@Injectable()
export class UpdateAssignmentUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
  ) {}

  async execute(courseId: string, assignmentId: string, dto: UpdateAssignmentDto, actorId: string, actorRole: UserRole): Promise<AssignmentEntity> {
    const [course, assignment] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    if (dto.dueDate !== undefined && dto.dueDate !== null) {
      const due = new Date(dto.dueDate);
      if (isNaN(due.getTime())) throw new BadRequestException('dueDate is not a valid date');
      const storedMs = assignment.dueDate?.getTime();
      if (due.getTime() !== storedMs && due <= new Date(Date.now() + 60_000)) {
        throw new BadRequestException('dueDate must be at least 1 minute in the future');
      }
    }

    // Cross-course lessonId validation: we cannot cheaply verify lesson.module.courseId === courseId
    // without adding a module-repo dependency. The @IsCuid() DTO guard + P2003 catch in the adapter
    // (FK constraint on lessonId) is the pragmatic safety net.
    return this.assignmentRepo.update(assignmentId, {
      title: dto.title,
      description: dto.description,
      lessonId: dto.lessonId,
      dueDate: dto.dueDate !== undefined ? (dto.dueDate !== null ? new Date(dto.dueDate) : null) : undefined,
      allowLate: dto.allowLate,
      maxScore: dto.maxScore,
      weight: dto.weight,
    });
  }
}
