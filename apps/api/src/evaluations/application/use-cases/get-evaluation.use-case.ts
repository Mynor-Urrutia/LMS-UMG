import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COURSE_REPOSITORY, ICourseRepository } from '../../../courses/domain/ports/course-repository.port';
import { EVALUATION_REPOSITORY, IEvaluationRepository } from '../../domain/ports/evaluation-repository.port';
import { ENROLLMENT_REPOSITORY, IEnrollmentRepository } from '../../../enrollments/domain/ports/enrollment-repository.port';
import {
  EvaluationWithQuestionsEntity,
  EvaluationQuestionEntity,
  QuestionOptionEntity,
} from '../../domain/entities/evaluation.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { EnrollmentStatus } from '../../../enrollments/domain/entities/enrollment.entity';

type StudentOptionView = Omit<QuestionOptionEntity, 'isCorrect'>;

interface StudentQuestionView extends Omit<EvaluationQuestionEntity, 'options'> {
  options: StudentOptionView[];
}

export interface StudentEvaluationView extends Omit<EvaluationWithQuestionsEntity, 'questions'> {
  questions: StudentQuestionView[];
}

@Injectable()
export class GetEvaluationUseCase {
  constructor(
    @Inject(EVALUATION_REPOSITORY) private readonly evalRepo: IEvaluationRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollRepo: IEnrollmentRepository,
  ) {}

  async execute(
    courseId: string,
    evaluationId: string,
    actorId: string,
    actorRole: UserRole,
  ): Promise<EvaluationWithQuestionsEntity | StudentEvaluationView> {
    const evaluation = await this.evalRepo.findById(evaluationId);
    if (!evaluation || evaluation.courseId !== courseId) throw new NotFoundException('Evaluation not found');

    if (actorRole === UserRole.STUDENT) {
      const enrollment = await this.enrollRepo.findByStudentAndCourse(actorId, courseId);
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('You must be enrolled in this course');
      }
      // Hide isCorrect flags for students
      return {
        ...evaluation,
        questions: evaluation.questions.map((q) => ({
          ...q,
          options: q.options.map((o) => ({ id: o.id, questionId: o.questionId, text: o.text, order: o.order })),
        })),
      };
    }

    const course = await this.courseRepo.findById(courseId);
    if (actorRole === UserRole.TEACHER && course?.teacherId !== actorId) {
      throw new ForbiddenException('You do not teach this course');
    }

    return evaluation;
  }
}
