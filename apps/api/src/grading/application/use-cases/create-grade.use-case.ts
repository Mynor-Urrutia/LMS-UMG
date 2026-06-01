import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';
import { IAssignmentRepository, ASSIGNMENT_REPOSITORY } from '../../../assignments/domain/ports/assignment-repository.port';
import { ISubmissionRepository, SUBMISSION_REPOSITORY } from '../../../submissions/domain/ports/submission-repository.port';
import { IGradeRepository, GRADE_REPOSITORY } from '../../domain/ports/grade-repository.port';
import { GradeEntity } from '../../domain/entities/grade.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { CreateGradeDto } from '../dtos/create-grade.dto';

@Injectable()
export class CreateGradeUseCase {
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
    dto: CreateGradeDto,
    actorId: string,
    actorRole: UserRole,
  ): Promise<GradeEntity> {
    if (actorRole === UserRole.STUDENT) throw new ForbiddenException('Students cannot grade submissions');

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

    const existingGrade = await this.gradeRepo.findBySubmission(submissionId);
    if (existingGrade) throw new ConflictException('This submission already has a grade');

    if (dto.score > assignment.maxScore) {
      throw new BadRequestException(`Score cannot exceed the assignment max score of ${assignment.maxScore}`);
    }

    return this.gradeRepo.create({
      submissionId,
      teacherId: actorRole === UserRole.TEACHER ? actorId : null, // null for ADMIN — no teacher attribution at creation
      score: dto.score,
      maxScore: assignment.maxScore,
      feedback: dto.feedback ?? null,
    });
  }
}
