import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ICategoryRepository,
  ICreateCategoryData,
  IUpdateCategoryData,
} from '../../domain/ports/category-repository.port';
import { CategoryEntity } from '../../domain/entities/category.entity';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  _count: { select: { courses: true } },
} as const;

// Derived from CATEGORY_SELECT so type and query shape can never drift apart
type CategoryRow = Prisma.CourseCategoryGetPayload<{ select: typeof CATEGORY_SELECT }>;

@Injectable()
export class PrismaCategoriesAdapter implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryEntity[]> {
    const rows = await this.prisma.courseCategory.findMany({
      select: CATEGORY_SELECT,
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.courseCategory.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    return row ? this.toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    const row = await this.prisma.courseCategory.findUnique({
      where: { slug },
      select: CATEGORY_SELECT,
    });
    return row ? this.toEntity(row) : null;
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    // Case-insensitivity is handled by MySQL utf8mb4_unicode_ci collation (mode: 'insensitive' is PostgreSQL-only)
    const row = await this.prisma.courseCategory.findFirst({
      where: {
        name: { equals: name },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const row = await this.prisma.courseCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    return row !== null;
  }

  async create(data: ICreateCategoryData): Promise<CategoryEntity> {
    try {
      const row = await this.prisma.courseCategory.create({
        data: { name: data.name, slug: data.slug },
        select: CATEGORY_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Narrow TOCTOU race: two concurrent creates with the same name/slug both passed checks
        const targets = Array.isArray(err.meta?.target) ? (err.meta.target as unknown[]) : [];
        const field = targets.some((t) => typeof t === 'string' && t.includes('slug')) ? 'slug' : 'name';
        throw new ConflictException(`Category ${field} already exists`);
      }
      throw err;
    }
  }

  async update(id: string, data: IUpdateCategoryData): Promise<CategoryEntity> {
    try {
      const row = await this.prisma.courseCategory.update({
        where: { id },
        data: { name: data.name },
        select: CATEGORY_SELECT,
      });
      return this.toEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException('Category name already exists');
        }
        if (err.code === 'P2025') {
          throw new NotFoundException('Category not found');
        }
      }
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.courseCategory.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2003') {
          // Narrow TOCTOU race: a course was assigned between the courseCount check and the delete
          throw new ConflictException('Cannot delete a category that still has courses assigned');
        }
        if (err.code === 'P2025') {
          throw new NotFoundException('Category not found');
        }
      }
      throw err;
    }
  }

  private toEntity(row: CategoryRow): CategoryEntity {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      courseCount: row._count.courses,
    };
  }
}
