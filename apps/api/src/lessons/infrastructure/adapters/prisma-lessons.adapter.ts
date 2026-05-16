import { Injectable, NotFoundException } from '@nestjs/common';
import { LessonType as PrismaLessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ILessonRepository,
  ICreateLessonData,
  IUpdateLessonData,
} from '../../domain/ports/lesson-repository.port';
import { LessonEntity, LessonType } from '../../domain/entities/lesson.entity';

const LESSON_SELECT = {
  id: true,
  moduleId: true,
  fileAssetId: true,
  title: true,
  type: true,
  content: true,
  videoUrl: true,
  filePath: true,
  order: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

type LessonRow = Prisma.LessonGetPayload<{ select: typeof LESSON_SELECT }>;

@Injectable()
export class PrismaLessonsAdapter implements ILessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<LessonEntity | null> {
    const row = await this.prisma.lesson.findUnique({ where: { id }, select: LESSON_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findByModule(moduleId: string): Promise<LessonEntity[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { moduleId },
      select: LESSON_SELECT,
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async maxOrder(moduleId: string): Promise<number> {
    const result = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: { order: true },
    });
    return result._max.order ?? 0;
  }

  async create(data: ICreateLessonData): Promise<LessonEntity> {
    const row = await this.prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        type: data.type as PrismaLessonType,
        content: data.content,
        videoUrl: data.videoUrl,
        order: data.order,
      },
      select: LESSON_SELECT,
    });
    return this.toEntity(row);
  }

  async update(id: string, data: IUpdateLessonData): Promise<LessonEntity> {
    try {
      const row = await this.prisma.lesson.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.content !== undefined && { content: data.content }),
          ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        },
        select: LESSON_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Lesson not found');
      }
      throw err;
    }
  }

  async updatePublished(id: string, isPublished: boolean): Promise<void> {
    try {
      await this.prisma.lesson.update({
        where: { id },
        data: { isPublished },
        select: { id: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Lesson not found');
      }
      throw err;
    }
  }

  async reorder(moduleId: string, orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Pass 1: move to negative orders to avoid @@unique([moduleId, order]) constraint conflicts
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.lesson.update({ where: { id: orderedIds[i] }, data: { order: -(i + 1) } });
      }
      // Pass 2: assign final positive orders
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.lesson.update({ where: { id: orderedIds[i] }, data: { order: i + 1 } });
      }
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.lesson.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Lesson not found');
      }
      throw err;
    }
  }

  private toEntity(row: LessonRow): LessonEntity {
    return {
      id: row.id,
      moduleId: row.moduleId,
      fileAssetId: row.fileAssetId,
      title: row.title,
      // Direct cast is safe: Prisma and domain enums share identical string values by design
      type: row.type as LessonType,
      content: row.content,
      videoUrl: row.videoUrl,
      filePath: row.filePath,
      order: row.order,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
