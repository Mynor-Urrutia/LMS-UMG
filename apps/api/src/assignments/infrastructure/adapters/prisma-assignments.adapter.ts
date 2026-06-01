import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AssignmentType as PrismaAssignmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IAssignmentRepository,
  ICreateAssignmentData,
  IUpdateAssignmentData,
  ICreateQuizQuestionData,
  IUpdateQuizQuestionData,
  ICreateDilemmaScenarioData,
} from '../../domain/ports/assignment-repository.port';
import { AssignmentEntity, AssignmentType, DilemmaChoiceEntity, DilemmaScenarioEntity, QuizQuestionEntity } from '../../domain/entities/assignment.entity';

const ASSIGNMENT_SELECT = {
  id: true,
  courseId: true,
  lessonId: true,
  title: true,
  description: true,
  type: true,
  dueDate: true,
  allowLate: true,
  maxScore: true,
  weight: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AssignmentRow = Prisma.AssignmentGetPayload<{ select: typeof ASSIGNMENT_SELECT }>;

const QUESTION_SELECT = {
  id: true,
  assignmentId: true,
  question: true,
  options: true,
  correctOption: true,
  order: true,
  createdAt: true,
} as const;

type QuestionRow = Prisma.QuizQuestionGetPayload<{ select: typeof QUESTION_SELECT }>;

@Injectable()
export class PrismaAssignmentsAdapter implements IAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AssignmentEntity | null> {
    const row = await this.prisma.assignment.findUnique({ where: { id }, select: ASSIGNMENT_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findByCourse(courseId: string): Promise<AssignmentEntity[]> {
    const rows = await this.prisma.assignment.findMany({
      where: { courseId },
      select: ASSIGNMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(data: ICreateAssignmentData): Promise<AssignmentEntity> {
    try {
      const row = await this.prisma.assignment.create({
        data: {
          courseId: data.courseId,
          lessonId: data.lessonId,
          title: data.title,
          description: data.description,
          type: data.type as PrismaAssignmentType,
          dueDate: data.dueDate,
          allowLate: data.allowLate,
          maxScore: data.maxScore,
          weight: data.weight,
        },
        select: ASSIGNMENT_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2003') {
          throw new UnprocessableEntityException('lessonId references a lesson that does not exist');
        }
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateAssignmentData): Promise<AssignmentEntity> {
    try {
      const row = await this.prisma.assignment.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.lessonId !== undefined && { lessonId: data.lessonId }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
          ...(data.allowLate !== undefined && { allowLate: data.allowLate }),
          ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
          ...(data.weight !== undefined && { weight: data.weight }),
        },
        select: ASSIGNMENT_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') throw new NotFoundException('Assignment not found');
        if (err.code === 'P2003') throw new UnprocessableEntityException('lessonId references a lesson that does not exist');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.assignment.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Assignment not found');
      }
      throw err;
    }
  }

  async findQuestionsByAssignment(assignmentId: string): Promise<QuizQuestionEntity[]> {
    const rows = await this.prisma.quizQuestion.findMany({
      where: { assignmentId },
      select: QUESTION_SELECT,
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => this.toQuestionEntity(r));
  }

  async findQuestionById(id: string): Promise<QuizQuestionEntity | null> {
    const row = await this.prisma.quizQuestion.findUnique({ where: { id }, select: QUESTION_SELECT });
    return row ? this.toQuestionEntity(row) : null;
  }

  async addQuestion(data: ICreateQuizQuestionData): Promise<QuizQuestionEntity> {
    // maxOrder aggregate + quizQuestion.create run inside a single transaction to prevent
    // race conditions where two concurrent requests read the same maxOrder and collide on @@unique([assignmentId, order])
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const result = await tx.quizQuestion.aggregate({
          where: { assignmentId: data.assignmentId },
          _max: { order: true },
        });
        const nextOrder = (result._max.order ?? 0) + 1;

        return tx.quizQuestion.create({
          data: {
            assignmentId: data.assignmentId,
            question: data.question,
            options: data.options,
            correctOption: data.correctOption,
            order: nextOrder,
          },
          select: QUESTION_SELECT,
        });
      });
      return this.toQuestionEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException('Order conflict due to concurrent request — please retry adding the question');
        }
      }
      throw err;
    }
  }

  async updateQuestion(id: string, data: IUpdateQuizQuestionData): Promise<QuizQuestionEntity> {
    try {
      const row = await this.prisma.quizQuestion.update({
        where: { id },
        data: {
          ...(data.question !== undefined && { question: data.question }),
          ...(data.options !== undefined && { options: data.options }),
          ...(data.correctOption !== undefined && { correctOption: data.correctOption }),
        },
        select: QUESTION_SELECT,
      });
      return this.toQuestionEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Question not found');
      }
      throw err;
    }
  }

  async deleteQuestion(id: string): Promise<void> {
    try {
      await this.prisma.quizQuestion.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Question not found');
      }
      throw err;
    }
  }

  async reorderQuestions(assignmentId: string, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;
    // Two-phase approach to handle @@unique([assignmentId, order]) constraint:
    // Phase 1 → shift to large negative offsets (no conflicts); Phase 2 → set final 1-based values.
    const offset = orderedIds.length + 1;
    try {
      await this.prisma.$transaction([
        ...orderedIds.map((id, i) =>
          this.prisma.quizQuestion.update({ where: { id }, data: { order: -(offset + i) } }),
        ),
        ...orderedIds.map((id, i) =>
          this.prisma.quizQuestion.update({ where: { id }, data: { order: i + 1 } }),
        ),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('One or more questions were not found — the list may have changed, please retry');
      }
      throw err;
    }
  }

  private toEntity(row: AssignmentRow): AssignmentEntity {
    return {
      id: row.id,
      courseId: row.courseId,
      lessonId: row.lessonId,
      title: row.title,
      description: row.description,
      type: row.type as AssignmentType,
      dueDate: row.dueDate,
      allowLate: row.allowLate,
      maxScore: row.maxScore,
      weight: row.weight,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createDilemmaScenario(data: ICreateDilemmaScenarioData): Promise<DilemmaScenarioEntity> {
    const row = await this.prisma.dilemmaScenario.create({
      data: {
        assignmentId: data.assignmentId,
        scenario: data.scenario,
        choices: {
          create: data.choices.map((c, i) => ({
            text: c.text,
            consequence: c.consequence,
            ethicalScore: c.ethicalScore ?? 50,
            order: i + 1,
          })),
        },
      },
      include: { choices: { orderBy: { order: 'asc' } } },
    });
    return this.toDilemmaEntity(row);
  }

  async findDilemmaScenario(assignmentId: string): Promise<DilemmaScenarioEntity | null> {
    const row = await this.prisma.dilemmaScenario.findUnique({
      where: { assignmentId },
      include: { choices: { orderBy: { order: 'asc' } } },
    });
    return row ? this.toDilemmaEntity(row) : null;
  }

  async findChoiceById(id: string): Promise<DilemmaChoiceEntity | null> {
    const row = await this.prisma.dilemmaChoice.findUnique({
      where: { id },
      select: { id: true, scenarioId: true, text: true, consequence: true, ethicalScore: true, order: true },
    });
    if (!row) return null;
    return { id: row.id, scenarioId: row.scenarioId, text: row.text, consequence: row.consequence, ethicalScore: row.ethicalScore, order: row.order };
  }

  private toDilemmaEntity(row: { id: string; assignmentId: string; scenario: string; createdAt: Date; updatedAt: Date; choices: { id: string; scenarioId: string; text: string; consequence: string; ethicalScore: number; order: number }[] }): DilemmaScenarioEntity {
    return {
      id: row.id,
      assignmentId: row.assignmentId,
      scenario: row.scenario,
      choices: row.choices.map((c) => ({
        id: c.id,
        scenarioId: c.scenarioId,
        text: c.text,
        consequence: c.consequence,
        ethicalScore: c.ethicalScore,
        order: c.order,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toQuestionEntity(row: QuestionRow): QuizQuestionEntity {
    return {
      id: row.id,
      assignmentId: row.assignmentId,
      question: row.question,
      // options is stored as JSON in Prisma — cast is safe because we always write string[]
      options: row.options as string[],
      correctOption: row.correctOption,
      order: row.order,
      createdAt: row.createdAt,
    };
  }
}
