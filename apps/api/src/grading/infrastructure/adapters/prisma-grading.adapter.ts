import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IGradeRepository, ICreateGradeData, IUpdateGradeData } from '../../domain/ports/grade-repository.port';
import { GradeEntity } from '../../domain/entities/grade.entity';

const GRADE_SELECT = {
  id: true,
  submissionId: true,
  teacherId: true,
  score: true,
  maxScore: true,
  feedback: true,
  gradedAt: true,
  updatedAt: true,
} as const;

type GradeRow = Prisma.GradeGetPayload<{ select: typeof GRADE_SELECT }>;

function toEntity(row: GradeRow): GradeEntity {
  return {
    id: row.id,
    submissionId: row.submissionId,
    teacherId: row.teacherId,
    score: row.score,
    maxScore: row.maxScore,
    feedback: row.feedback,
    gradedAt: row.gradedAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaGradingAdapter implements IGradeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubmission(submissionId: string): Promise<GradeEntity | null> {
    const row = await this.prisma.grade.findUnique({
      where: { submissionId },
      select: GRADE_SELECT,
    });
    return row ? toEntity(row) : null;
  }

  async create(data: ICreateGradeData): Promise<GradeEntity> {
    try {
      const row = await this.prisma.grade.create({
        data: {
          submissionId: data.submissionId,
          teacherId: data.teacherId,
          score: data.score,
          maxScore: data.maxScore,
          feedback: data.feedback,
        },
        select: GRADE_SELECT,
      });
      return toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') throw new ConflictException('This submission already has a grade');
        if (err.code === 'P2003') throw new NotFoundException('Related entity not found');
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateGradeData): Promise<GradeEntity> {
    try {
      const row = await this.prisma.grade.update({
        where: { id },
        data: {
          ...(data.score !== undefined && { score: data.score }),
          ...(data.feedback !== undefined && { feedback: data.feedback }),
          teacherId: data.teacherId,
        },
        select: GRADE_SELECT,
      });
      return toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Grade not found');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.grade.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Grade not found');
      }
      throw err;
    }
  }
}
