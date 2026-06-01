import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

export interface QuestionResult {
  questionId: string;
  questionText: string;
  type: string;
  points: number;
  earnedPoints: number | null;
  isPending: boolean;
  textAnswer: string | null;
  selectedIds: string[] | null;
  correctIds: string[] | null;
}

export interface AttemptResultDto {
  attemptId: string;
  evaluationId: string;
  evaluationTitle: string;
  totalPoints: number;
  score: number | null;
  percentage: number | null;
  feedback: string | null;
  hasPendingQuestions: boolean;
  submittedAt: Date;
  questions: QuestionResult[];
}

@Injectable()
export class GetMyAttemptUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollRepo: IEnrollmentRepository,
  ) {}

  async execute(courseId: string, evaluationId: string, studentId: string): Promise<AttemptResultDto> {
    const enrollment = await this.enrollRepo.findByStudentAndCourse(studentId, courseId);
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You must be enrolled in this course');
    }

    const evaluation = await this.evalRepo.findById(evaluationId);
    if (!evaluation || evaluation.courseId !== courseId) throw new NotFoundException('Evaluation not found');

    const attempt = await this.evalRepo.findAttempt(evaluationId, studentId);
    if (!attempt) throw new NotFoundException('You have not submitted this evaluation yet');

    let hasPendingQuestions = false;
    const questions: QuestionResult[] = evaluation.questions.map(q => {
      const answer = attempt.answers.find(a => a.questionId === q.id);
      const selectedIds = answer?.selectedIds ? (JSON.parse(answer.selectedIds) as string[]) : null;

      if (q.type === 'TEXT') {
        hasPendingQuestions = true;
        return {
          questionId: q.id,
          questionText: q.text,
          type: q.type,
          points: q.points,
          earnedPoints: null,
          isPending: true,
          textAnswer: answer?.textAnswer ?? null,
          selectedIds: null,
          correctIds: null,
        };
      }

      const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
      const isCorrect =
        selectedIds !== null &&
        correctIds.length === selectedIds.length &&
        correctIds.every(id => selectedIds.includes(id));

      return {
        questionId: q.id,
        questionText: q.text,
        type: q.type,
        points: q.points,
        earnedPoints: isCorrect ? q.points : 0,
        isPending: false,
        textAnswer: null,
        selectedIds,
        correctIds,
      };
    });

    const percentage =
      attempt.score !== null
        ? Math.round((attempt.score / evaluation.totalPoints) * 100)
        : null;

    return {
      attemptId: attempt.id,
      evaluationId: evaluation.id,
      evaluationTitle: evaluation.title,
      totalPoints: evaluation.totalPoints,
      score: attempt.score,
      percentage,
      feedback: attempt.feedback,
      hasPendingQuestions,
      submittedAt: attempt.submittedAt,
      questions,
    };
  }
}
