import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ICourseReviewRepository,
  ICreateReviewData,
  ListReviewsResult,
} from '../../domain/ports/course-review-repository.port';
import { CourseReviewEntity } from '../../domain/entities/course-review.entity';

const REVIEW_SELECT = {
  id: true,
  courseId: true,
  studentId: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      profile: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

type ReviewRow = Prisma.CourseReviewGetPayload<{ select: typeof REVIEW_SELECT }>;

@Injectable()
export class PrismaCourseReviewsAdapter implements ICourseReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CourseReviewEntity | null> {
    const row = await this.prisma.courseReview.findUnique({ where: { id }, select: REVIEW_SELECT });
    return row ? this.toEntity(row) : null;
  }

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<CourseReviewEntity | null> {
    const row = await this.prisma.courseReview.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: REVIEW_SELECT,
    });
    return row ? this.toEntity(row) : null;
  }

  async listByCourse(courseId: string, page: number, limit: number): Promise<ListReviewsResult> {
    const skip = (page - 1) * limit;
    const [items, total, aggregate] = await this.prisma.$transaction([
      this.prisma.courseReview.findMany({
        where: { courseId },
        select: REVIEW_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.courseReview.count({ where: { courseId } }),
      this.prisma.courseReview.aggregate({ where: { courseId }, _avg: { rating: true } }),
    ]);

    return {
      items: (items as ReviewRow[]).map((r) => this.toEntity(r)),
      total,
      avgRating: aggregate._avg.rating,
    };
  }

  async create(data: ICreateReviewData): Promise<CourseReviewEntity> {
    const row = await this.prisma.courseReview.create({
      data: {
        courseId: data.courseId,
        studentId: data.studentId,
        rating: data.rating,
        comment: data.comment,
      },
      select: REVIEW_SELECT,
    });
    return this.toEntity(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.courseReview.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Review not found');
      }
      throw err;
    }
  }

  private toEntity(row: ReviewRow): CourseReviewEntity {
    return {
      id: row.id,
      courseId: row.courseId,
      studentId: row.studentId,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      student: {
        id: row.studentId,
        firstName: row.student?.profile?.firstName ?? '',
        lastName: row.student?.profile?.lastName ?? '',
      },
    };
  }
}
