import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IModuleRepository,
  ICreateModuleData,
  IUpdateModuleData,
} from '../../domain/ports/course-module-repository.port';
import { CourseModuleEntity, CourseModuleWithLessons } from '../../domain/entities/course-module.entity';
import { LessonType } from '../../../common/enums/lesson-type.enum';

const MODULE_SELECT = {
  id: true,
  courseId: true,
  title: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ModuleRow = Prisma.CourseModuleGetPayload<{ select: typeof MODULE_SELECT }>;

@Injectable()
export class PrismaCourseModulesAdapter implements IModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CourseModuleEntity | null> {
    const row = await this.prisma.courseModule.findUnique({ where: { id }, select: MODULE_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findByCourse(courseId: string): Promise<CourseModuleWithLessons[]> {
    const rows = await this.prisma.courseModule.findMany({
      where: { courseId },
      select: {
        id: true,
        courseId: true,
        title: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        lessons: {
          select: { id: true, title: true, type: true, order: true, isPublished: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      order: row.order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lessons: row.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type as LessonType,
        order: l.order,
        isPublished: l.isPublished,
      })),
    }));
  }

  async maxOrder(courseId: string): Promise<number> {
    const result = await this.prisma.courseModule.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    return result._max.order ?? 0;
  }

  async create(data: ICreateModuleData): Promise<CourseModuleEntity> {
    const row = await this.prisma.courseModule.create({
      data: { courseId: data.courseId, title: data.title, order: data.order },
      select: MODULE_SELECT,
    });
    return this.toEntity(row);
  }

  async update(id: string, data: IUpdateModuleData): Promise<CourseModuleEntity> {
    try {
      const row = await this.prisma.courseModule.update({
        where: { id },
        data: { ...(data.title !== undefined && { title: data.title }) },
        select: MODULE_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Module not found');
      }
      throw err;
    }
  }

  async reorder(courseId: string, orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Pass 1: move to negative orders to avoid @@unique([courseId, order]) constraint conflicts
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.courseModule.update({ where: { id: orderedIds[i] }, data: { order: -(i + 1) } });
      }
      // Pass 2: assign final positive orders
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.courseModule.update({ where: { id: orderedIds[i] }, data: { order: i + 1 } });
      }
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.courseModule.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Module not found');
      }
      throw err;
    }
  }

  private toEntity(row: ModuleRow): CourseModuleEntity {
    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      order: row.order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
