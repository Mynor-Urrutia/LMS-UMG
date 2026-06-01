import { Injectable } from '@nestjs/common';
import { QuestionType as PrismaQuestionType } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IEvaluationRepository,
  ICreateEvaluationData,
  IAddQuestionData,
  ISubmitAttemptData,
  IUpdateEvaluationData,
  AttemptWithStudentInfo,
} from '../../domain/ports/evaluation-repository.port';
import {
  EvaluationEntity,
  EvaluationWithQuestionsEntity,
  EvaluationQuestionEntity,
  QuestionOptionEntity,
  StudentAttemptEntity,
  AttemptAnswerEntity,
  QuestionType,
} from '../../domain/entities/evaluation.entity';

@Injectable()
export class PrismaEvaluationsAdapter implements IEvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateEvaluationData): Promise<EvaluationEntity> {
    const row = await this.prisma.evaluation.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description ?? null,
        dueDate: data.dueDate ?? null,
        totalPoints: data.totalPoints ?? 100,
      },
    });
    return this.toEvalEntity(row);
  }

  async findByCourse(courseId: string, publishedOnly = false): Promise<EvaluationEntity[]> {
    const rows = await this.prisma.evaluation.findMany({
      where: { courseId, ...(publishedOnly ? { isPublished: true } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEvalEntity(r));
  }

  async update(id: string, data: IUpdateEvaluationData): Promise<EvaluationEntity> {
    const row = await this.prisma.evaluation.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.totalPoints !== undefined && { totalPoints: data.totalPoints }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });
    return this.toEvalEntity(row);
  }

  async findById(id: string): Promise<EvaluationWithQuestionsEntity | null> {
    const row = await this.prisma.evaluation.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } },
          },
        },
      },
    });
    if (!row) return null;
    return {
      ...this.toEvalEntity(row),
      questions: row.questions.map((q) => this.toQuestionEntity(q)),
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.evaluation.delete({ where: { id } });
  }

  async addQuestion(data: IAddQuestionData): Promise<EvaluationQuestionEntity> {
    const count = await this.prisma.evaluationQuestion.count({
      where: { evaluationId: data.evaluationId },
    });
    const order = count + 1;

    const row = await this.prisma.$transaction(async (tx) => {
      const question = await tx.evaluationQuestion.create({
        data: {
          evaluationId: data.evaluationId,
          text: data.text,
          type: data.type as PrismaQuestionType,
          points: data.points,
          order,
        },
      });

      if (data.options && data.options.length > 0) {
        await tx.questionOption.createMany({
          data: data.options.map((opt, idx) => ({
            questionId: question.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: idx + 1,
          })),
        });
      }

      return tx.evaluationQuestion.findUnique({
        where: { id: question.id },
        include: { options: { orderBy: { order: 'asc' } } },
      });
    });

    return this.toQuestionEntity(row!);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    await this.prisma.evaluationQuestion.delete({ where: { id: questionId } });
  }

  async submitAttempt(data: ISubmitAttemptData): Promise<StudentAttemptEntity> {
    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.studentAttempt.create({
        data: {
          evaluationId: data.evaluationId,
          studentId: data.studentId,
        },
      });

      await tx.questionAnswer.createMany({
        data: data.answers.map((a) => ({
          attemptId: created.id,
          questionId: a.questionId,
          textAnswer: a.textAnswer ?? null,
          selectedIds: a.selectedIds ? JSON.stringify(a.selectedIds) : null,
        })),
      });

      return tx.studentAttempt.findUnique({
        where: { id: created.id },
        include: { answers: true },
      });
    });

    return this.toAttemptEntity(attempt!);
  }

  async findAttempt(evaluationId: string, studentId: string): Promise<StudentAttemptEntity | null> {
    const row = await this.prisma.studentAttempt.findUnique({
      where: { evaluationId_studentId: { evaluationId, studentId } },
      include: { answers: true },
    });
    return row ? this.toAttemptEntity(row) : null;
  }

  async findAttemptsByEvaluation(evaluationId: string): Promise<AttemptWithStudentInfo[]> {
    const rows = await this.prisma.studentAttempt.findMany({
      where: { evaluationId },
      orderBy: { submittedAt: 'asc' },
      include: {
        answers: true,
        student: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return rows.map((r) => ({
      ...this.toAttemptEntity(r),
      studentFirstName: r.student.profile?.firstName ?? '',
      studentLastName: r.student.profile?.lastName ?? '',
      studentEmail: r.student.email,
    }));
  }

  async gradeAttempt(attemptId: string, score: number, feedback?: string | null): Promise<StudentAttemptEntity> {
    const row = await this.prisma.studentAttempt.update({
      where: { id: attemptId },
      data: { score, feedback: feedback ?? null },
      include: { answers: true },
    });
    return this.toAttemptEntity(row);
  }

  // ── Mapping helpers ──────────────────────────────────────────────────────────

  private toEvalEntity(row: {
    id: string;
    courseId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    totalPoints: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): EvaluationEntity {
    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate,
      totalPoints: row.totalPoints,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toQuestionEntity(row: {
    id: string;
    evaluationId: string;
    text: string;
    type: PrismaQuestionType;
    points: number;
    order: number;
    options: { id: string; questionId: string; text: string; isCorrect: boolean; order: number }[];
  }): EvaluationQuestionEntity {
    return {
      id: row.id,
      evaluationId: row.evaluationId,
      text: row.text,
      type: row.type as QuestionType,
      points: row.points,
      order: row.order,
      options: row.options.map((o) => this.toOptionEntity(o)),
    };
  }

  private toOptionEntity(row: {
    id: string;
    questionId: string;
    text: string;
    isCorrect: boolean;
    order: number;
  }): QuestionOptionEntity {
    return {
      id: row.id,
      questionId: row.questionId,
      text: row.text,
      isCorrect: row.isCorrect,
      order: row.order,
    };
  }

  private toAttemptEntity(row: {
    id: string;
    evaluationId: string;
    studentId: string;
    submittedAt: Date;
    score: number | null;
    feedback: string | null;
    answers: { id: string; attemptId: string; questionId: string; textAnswer: string | null; selectedIds: string | null }[];
  }): StudentAttemptEntity {
    return {
      id: row.id,
      evaluationId: row.evaluationId,
      studentId: row.studentId,
      submittedAt: row.submittedAt,
      score: row.score,
      feedback: row.feedback,
      answers: row.answers.map((a) => this.toAnswerEntity(a)),
    };
  }

  private toAnswerEntity(row: {
    id: string;
    questionId: string;
    textAnswer: string | null;
    selectedIds: string | null;
  }): AttemptAnswerEntity {
    return {
      id: row.id,
      questionId: row.questionId,
      textAnswer: row.textAnswer,
      selectedIds: row.selectedIds,
    };
  }
}
