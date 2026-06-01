import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SurveyQuestionType as PrismaSurveyQuestionType } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ICreateSurveyData, ISurveyRepository } from '../../domain/ports/survey-repository.port';
import { SurveyAnswerInput, SurveyEntity, SurveyQuestionEntity, SurveyResultItem } from '../../domain/entities/survey.entity';
import { SurveyQuestionType } from '../../../common/enums/survey-question-type.enum';

const SURVEY_SELECT = {
  id: true,
  courseId: true,
  title: true,
  description: true,
  isAnonymous: true,
  isOpen: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SurveyRow = Prisma.SurveyGetPayload<{ select: typeof SURVEY_SELECT }>;

const QUESTION_SELECT = {
  id: true,
  surveyId: true,
  text: true,
  type: true,
  options: true,
  order: true,
} as const;

type QuestionRow = Prisma.SurveyQuestionGetPayload<{ select: typeof QUESTION_SELECT }>;

@Injectable()
export class PrismaSurveyAdapter implements ISurveyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SurveyEntity | null> {
    const row = await this.prisma.survey.findUnique({ where: { id }, select: SURVEY_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findByCourse(courseId: string): Promise<SurveyEntity[]> {
    const rows = await this.prisma.survey.findMany({
      where: { courseId },
      select: SURVEY_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findQuestions(surveyId: string): Promise<SurveyQuestionEntity[]> {
    const rows = await this.prisma.surveyQuestion.findMany({
      where: { surveyId },
      select: QUESTION_SELECT,
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => this.toQuestionEntity(r));
  }

  async create(data: ICreateSurveyData): Promise<SurveyEntity> {
    const row = await this.prisma.survey.create({
      data: {
        courseId: data.courseId ?? null,
        title: data.title,
        description: data.description ?? null,
        isAnonymous: data.isAnonymous ?? true,
        questions: {
          create: data.questions.map((q, i) => ({
            text: q.text,
            type: q.type as PrismaSurveyQuestionType,
            options: q.options ? q.options : undefined,
            order: i + 1,
          })),
        },
      },
      select: SURVEY_SELECT,
    });
    return this.toEntity(row);
  }

  async open(id: string): Promise<void> {
    try {
      await this.prisma.survey.update({ where: { id }, data: { isOpen: true } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Survey not found');
      }
      throw err;
    }
  }

  async close(id: string): Promise<void> {
    try {
      await this.prisma.survey.update({ where: { id }, data: { isOpen: false } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Survey not found');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.survey.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Survey not found');
      }
      throw err;
    }
  }

  async submitResponse(surveyId: string, userId: string | null, answers: SurveyAnswerInput[]): Promise<void> {
    await this.prisma.surveyResponse.create({
      data: {
        surveyId,
        userId,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            textAnswer: a.textAnswer ?? null,
            selected: a.selected ?? undefined,
          })),
        },
      },
    });
  }

  async hasResponded(surveyId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.surveyResponse.count({ where: { surveyId, userId } });
    return count > 0;
  }

  async getResults(surveyId: string): Promise<SurveyResultItem[]> {
    const questions = await this.prisma.surveyQuestion.findMany({
      where: { surveyId },
      orderBy: { order: 'asc' },
      include: {
        answers: true,
      },
    });

    return questions.map((q) => {
      const opts = q.options ? (q.options as string[]) : [];
      const textAnswers = q.answers.filter((a) => a.textAnswer).map((a) => a.textAnswer as string);
      const optionCounts = opts.map((_, idx) =>
        q.answers.filter((a) => {
          const sel = a.selected ? (a.selected as number[]) : [];
          return sel.includes(idx);
        }).length,
      );

      return {
        questionId: q.id,
        text: q.text,
        type: q.type as SurveyQuestionType,
        options: opts.length > 0 ? opts : null,
        totalResponses: q.answers.length,
        textAnswers,
        optionCounts,
      };
    });
  }

  private toEntity(row: SurveyRow): SurveyEntity {
    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      description: row.description,
      isAnonymous: row.isAnonymous,
      isOpen: row.isOpen,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toQuestionEntity(row: QuestionRow): SurveyQuestionEntity {
    return {
      id: row.id,
      surveyId: row.surveyId,
      text: row.text,
      type: row.type as SurveyQuestionType,
      options: row.options ? (row.options as string[]) : null,
      order: row.order,
    };
  }
}
