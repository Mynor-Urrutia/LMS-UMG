import { Injectable } from '@nestjs/common';
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
  embedUrl: true,
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

  async countPublished(courseId: string): Promise<number> {
    return this.prisma.lesson.count({
      where: { module: { courseId }, isPublished: true },
    });
  }

  async findByModule(moduleId: string): Promise<LessonEntity[]> {
    const rows = await this.prisma.lesson.findMany({
      where: { moduleId },
      select: LESSON_SELECT,
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async create(data: ICreateLessonData): Promise<LessonEntity> {
    // maxOrder aggregate + lesson.create run inside a single transaction to prevent
    // race conditions where two concurrent requests read the same maxOrder and collide on @@unique([moduleId, order])
    const row = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lesson.aggregate({
        where: { moduleId: data.moduleId },
        _max: { order: true },
      });
      const nextOrder = (result._max.order ?? 0) + 1;

      return tx.lesson.create({
        data: {
          moduleId: data.moduleId,
          title: data.title,
          type: data.type as PrismaLessonType,
          content: data.content,
          videoUrl: data.videoUrl,
          fileAssetId: data.fileAssetId,
          filePath: data.filePath,
          embedUrl: data.embedUrl ?? null,
          order: nextOrder,
        },
        select: LESSON_SELECT,
      });
    });
    return this.toEntity(row);
  }

  async update(id: string, data: IUpdateLessonData): Promise<LessonEntity> {
    // P2025 here is a TOCTOU race — surfaces as 500, acceptable given pre-existence check in use-case
    const row = await this.prisma.lesson.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.fileAssetId !== undefined && { fileAssetId: data.fileAssetId }),
        ...(data.filePath !== undefined && { filePath: data.filePath }),
        ...(data.embedUrl !== undefined && { embedUrl: data.embedUrl }),
      },
      select: LESSON_SELECT,
    });
    return this.toEntity(row);
  }

  async updatePublished(id: string, isPublished: boolean): Promise<void> {
    // P2025 here is a TOCTOU race — surfaces as 500, acceptable given pre-existence check in use-case
    await this.prisma.lesson.update({
      where: { id },
      data: { isPublished },
      select: { id: true },
    });
  }

  async reorder(moduleId: string, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;
    await this.prisma.$transaction(async (tx) => {
      // Two raw SQL passes instead of 2N round-trips:
      // Pass 1: assign negative orders to avoid @@unique([moduleId, order]) constraint conflicts during transition
      // Pass 2: assign final positive orders
      const negCases = orderedIds.map((id, i) => Prisma.sql`WHEN ${id} THEN ${-(i + 1)}`);
      const posCases = orderedIds.map((id, i) => Prisma.sql`WHEN ${id} THEN ${i + 1}`);
      const idLiterals = orderedIds.map((id) => Prisma.sql`${id}`);

      await tx.$executeRaw(
        Prisma.sql`UPDATE lessons SET \`order\` = CASE id ${Prisma.join(negCases, ' ')} END WHERE id IN (${Prisma.join(idLiterals, ',')})`,
      );
      await tx.$executeRaw(
        Prisma.sql`UPDATE lessons SET \`order\` = CASE id ${Prisma.join(posCases, ' ')} END WHERE id IN (${Prisma.join(idLiterals, ',')})`,
      );
    });
  }

  async delete(id: string): Promise<void> {
    // P2025 here is a TOCTOU race — surfaces as 500, acceptable given pre-existence check in use-case
    await this.prisma.lesson.delete({ where: { id } });
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
      embedUrl: row.embedUrl,
      order: row.order,
      isPublished: row.isPublished,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
