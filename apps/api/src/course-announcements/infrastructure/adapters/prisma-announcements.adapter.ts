import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { IAnnouncementRepository, ICreateAnnouncementData } from '../../domain/ports/course-announcement-repository.port';
import { CourseAnnouncementEntity } from '../../domain/entities/course-announcement.entity';

const SELECT = {
  id: true,
  courseId: true,
  authorId: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { profile: { select: { firstName: true, lastName: true } } } },
} as const;

type Row = Prisma.CourseAnnouncementGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class PrismaAnnouncementsAdapter implements IAnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateAnnouncementData): Promise<CourseAnnouncementEntity> {
    const row = await this.prisma.courseAnnouncement.create({ data, select: SELECT });
    return this.toEntity(row);
  }

  async findByCourse(courseId: string): Promise<CourseAnnouncementEntity[]> {
    const rows = await this.prisma.courseAnnouncement.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: SELECT,
    });
    return rows.map(r => this.toEntity(r));
  }

  async findById(id: string): Promise<CourseAnnouncementEntity | null> {
    const row = await this.prisma.courseAnnouncement.findUnique({ where: { id }, select: SELECT });
    return row ? this.toEntity(row) : null;
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.courseAnnouncement.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Announcement not found');
      }
      throw err;
    }
  }

  private toEntity(row: Row): CourseAnnouncementEntity {
    const p = row.author?.profile;
    const authorName = p ? `${p.firstName} ${p.lastName}`.trim() : null;
    return {
      id: row.id,
      courseId: row.courseId,
      authorId: row.authorId,
      authorName,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
