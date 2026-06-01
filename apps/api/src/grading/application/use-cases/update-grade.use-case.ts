import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../../submissions/domain/ports/submission-repository.port';
import { IGradeRepository, GRADE_REPOSITORY } from '../../domain/ports/grade-repository.port';
import { GradeEntity } from '../../domain/entities/grade.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UpdateGradeDto } from '../dtos/update-grade.dto';

@Injectable()
export class UpdateGradeUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepo: IAssignmentRepository,
    @Inject(SUBMISSION_REPOSITORY) private readonly submissionRepo: ISubmissionRepository,
    @Inject(GRADE_REPOSITORY) private readonly gradeRepo: IGradeRepository,
  ) {}

  async execute(
    courseId: string,
    assignmentId: string,
    submissionId: string,
    dto: UpdateGradeDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<GradeEntity> {
    if (actorRole === UserRole.STUDENT) throw new ForbiddenException('Students cannot modify grades');

    if (dto.score === undefined && dto.feedback === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    const [course, assignment, submission] = await Promise.all([
      this.courseRepo.findById(courseId),
      this.assignmentRepo.findById(assignmentId),
      this.submissionRepo.findById(submissionId),
    ]);

    if (!course) throw new NotFoundException('Course not found');
    if (!assignment || assignment.courseId !== courseId) throw new NotFoundException('Assignment not found');
    if (!submission || submission.assignmentId !== assignmentId) throw new NotFoundException('Submission not found');

    if (actorRole === UserRole.TEACHER && course.teacherId !== actorId) {
      throw new ForbiddenException('You do not own this course');
    }

    const grade = await this.gradeRepo.findBySubmission(submissionId);
    if (!grade) throw new NotFoundException('Grade not found');

    if (dto.score !== undefined && dto.score > grade.maxScore) {
      throw new BadRequestException(`Score cannot exceed the graded max score of ${grade.maxScore}`);
    }

    return this.gradeRepo.update(grade.id, {
      ...(dto.score !== undefined && { score: dto.score }),
      ...(dto.feedback !== undefined && { feedback: dto.feedback }),
      // TEACHER stamps their own ID; ADMIN preserves original teacher attribution
      teacherId: actorRole === UserRole.TEACHER ? actorId : grade.teacherId,
    });
  }
}
