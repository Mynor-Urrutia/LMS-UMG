import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ICourseRepository, COURSE_REPOSITORY } from '../../../courses/domain/ports/course-repository.port';

export interface ModulePdfData {
  courseTitle: string;
  moduleTitle: string;
  moduleOrder: number;
  lessons: {
    title: string;
    type: string;
    content: string | null;
    videoUrl: string | null;
    embedUrl: string | null;
    order: number;
  }[];
}

@Injectable()
export class GetModulePdfUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(courseId: string, moduleId: string): Promise<ModulePdfData> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const mod = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          select: { title: true, type: true, content: true, videoUrl: true, embedUrl: true, order: true },
        },
      },
    });
    if (!mod) throw new NotFoundException('Module not found');

    return {
      courseTitle: course.title,
      moduleTitle: mod.title,
      moduleOrder: mod.order,
      lessons: mod.lessons,
    };
  }
}
