import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { StudentAttemptEntity } from '../../domain/entities/evaluation.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';
import { SubmitAttemptDto } from '../dtos/submit-attempt.dto';

@Injectable()
export class SubmitAttemptUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollRepo: IEnrollmentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    courseId: string,
    evaluationId: string,
    dto: SubmitAttemptDto,
    studentId: string,
  ): Promise<StudentAttemptEntity> {
    const enrollment = await this.enrollRepo.findByStudentAndCourse(studentId, courseId);
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You must be enrolled in this course');
    }

    const evaluation = await this.evalRepo.findById(evaluationId);
    if (!evaluation || evaluation.courseId !== courseId) throw new NotFoundException('Evaluation not found');

    const existing = await this.evalRepo.findAttempt(evaluationId, studentId);
    if (existing) throw new ConflictException('You have already submitted this evaluation');

    const questionIds = new Set(evaluation.questions.map((q) => q.id));
    for (const answer of dto.answers) {
      if (!questionIds.has(answer.questionId)) {
        throw new BadRequestException(`Invalid questionId: ${answer.questionId}`);
      }
    }

    let autoScore = 0;
    let totalPoints = 0;
    let hasTextQuestions = false;

    for (const q of evaluation.questions) {
      if (q.type === 'TEXT') {
        hasTextQuestions = true;
        continue;
      }
      totalPoints += q.points;
      const answer = dto.answers.find((a) => a.questionId === q.id);
      if (!answer?.selectedIds?.length) continue;
      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const isCorrect =
        correctIds.length === answer.selectedIds.length &&
        correctIds.every((id) => answer.selectedIds!.includes(id));
      if (isCorrect) autoScore += q.points;
    }

    const attempt = await this.evalRepo.submitAttempt({
      evaluationId,
      studentId,
      answers: dto.answers,
    });

    if (!hasTextQuestions) {
      const graded = await this.evalRepo.gradeAttempt(attempt.id, autoScore, null);
      if (totalPoints > 0 && autoScore === totalPoints) {
        this.eventEmitter.emit('evaluation.perfect', { studentId, courseId, evaluationId });
      }
      return graded;
    }

    return attempt;
  }
}
