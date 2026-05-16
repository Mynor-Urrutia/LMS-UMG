import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, CourseStatus as PrismaCourseStatus, Difficulty, EnrollmentType as PrismaEnrollmentType } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ICourseRepository,
  ICreateCourseData,
  IUpdateCourseData,
  ListCoursesFilter,
  PaginatedCourses,
} from '../../domain/ports/course-repository.port';
import { CourseEntity, CourseStatus, CourseDifficulty, EnrollmentType } from '../../domain/entities/course.entity';

const COURSE_SELECT = {
  id: true,
  teacherId: true,
  categoryId: true,
  title: true,
  slug: true,
  description: true,
  thumbnailPath: true,
  difficulty: true,
  status: true,
  enrollmentType: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Derived from COURSE_SELECT so type and query shape can never drift apart
type CourseRow = Prisma.CourseGetPayload<{ select: typeof COURSE_SELECT }>;

@Injectable()
export class PrismaCoursesAdapter implements ICourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CourseEntity | null> {
    const row = await this.prisma.course.findUnique({ where: { id }, select: COURSE_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<CourseEntity | null> {
    const row = await this.prisma.course.findUnique({ where: { slug }, select: COURSE_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const row = await this.prisma.course.findUnique({ where: { slug }, select: { id: true } });
    return row !== null;
  }

  async findAll(filter: ListCoursesFilter): Promise<PaginatedCourses> {
    const where: Prisma.CourseWhereInput = {};

    if (filter.status) where.status = filter.status as PrismaCourseStatus;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.difficulty) where.difficulty = filter.difficulty as Difficulty;
    if (filter.teacherId) where.teacherId = filter.teacherId;

    if (filter.search) {
      const term = filter.search;
      // Case-insensitivity is provided by utf8mb4_unicode_ci collation — do NOT add mode:'insensitive' (PostgreSQL/MongoDB only)
      where.OR = [
        { title: { contains: term } },
        { description: { contains: term } },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        select: COURSE_SELECT,
        skip,
        take: filter.limit,
        // Secondary sort on id guarantees stable pagination when createdAt ties
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      items: (courses as CourseRow[]).map((c) => this.toEntity(c)),
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async create(data: ICreateCourseData): Promise<CourseEntity> {
    try {
      const row = await this.prisma.course.create({
        data: {
          teacherId: data.teacherId,
          categoryId: data.categoryId,
          title: data.title,
          slug: data.slug,
          description: data.description,
          difficulty: data.difficulty as Difficulty,
          enrollmentType: data.enrollmentType as PrismaEnrollmentType,
        },
        select: COURSE_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          // MySQL Prisma returns err.meta.target as a constraint name string (e.g. "Course_slug_key"),
          // not an array like PostgreSQL does — handle both formats
          const target = err.meta?.target;
          const isSlug = Array.isArray(target)
            ? target.some((t) => typeof t === 'string' && t.includes('slug'))
            : typeof target === 'string' && target.includes('slug');
          throw new ConflictException(`Course ${isSlug ? 'slug' : 'title'} already exists`);
        }
        if (err.code === 'P2003') {
          throw new UnprocessableEntityException('categoryId references a category that does not exist');
        }
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateCourseData): Promise<CourseEntity> {
    try {
      const row = await this.prisma.course.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.difficulty !== undefined && { difficulty: data.difficulty as Difficulty }),
          ...(data.enrollmentType !== undefined && { enrollmentType: data.enrollmentType as PrismaEnrollmentType }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        },
        select: COURSE_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') throw new NotFoundException('Course not found');
        if (err.code === 'P2003') throw new UnprocessableEntityException('categoryId references a category that does not exist');
      }
      throw err;
    }
  }

  async updateStatus(id: string, status: CourseStatus): Promise<void> {
    try {
      await this.prisma.course.update({
        where: { id },
        data: { status: status as PrismaCourseStatus },
        select: { id: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Course not found');
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.course.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2025') throw new NotFoundException('Course not found');
        if (err.code === 'P2003') throw new ConflictException('Course has related records and cannot be deleted');
      }
      throw err;
    }
  }

  private toEntity(row: CourseRow): CourseEntity {
    return {
      id: row.id,
      teacherId: row.teacherId,
      categoryId: row.categoryId,
      title: row.title,
      slug: row.slug,
      description: row.description,
      thumbnailPath: row.thumbnailPath,
      // Direct cast is safe: Prisma and domain enums share identical string values by design
      difficulty: row.difficulty as CourseDifficulty,
      status: row.status as CourseStatus,
      enrollmentType: row.enrollmentType as EnrollmentType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
