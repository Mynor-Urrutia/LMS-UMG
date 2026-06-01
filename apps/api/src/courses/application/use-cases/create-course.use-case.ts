import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/ports/course-repository.port';
import { CourseEntity } from '../../domain/entities/course.entity';
import { CreateCourseDto } from '../dtos/create-course.dto';
import { CourseDifficulty } from '../../../common/enums/course-difficulty.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { slugify } from '../../../common/utils/slugify';
import { sanitizePlainText } from '../../../common/utils/sanitize';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CreateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: CreateCourseDto): Promise<CourseEntity> {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      select: { id: true, role: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    if (teacher.role !== UserRole.TEACHER) throw new BadRequestException('The assigned user must have the TEACHER role');

    const raw = slugify(dto.title);
    if (!raw) throw new BadRequestException('Course title produces an empty slug');
    const slug = raw.length > 100 ? raw.slice(0, 100).replace(/-+$/, '') : raw;

    return this.courseRepo.create({
      teacherId: dto.teacherId,
      categoryId: dto.categoryId ?? null,
      title: dto.title,
      slug,
      description: dto.description ? sanitizePlainText(dto.description) : null,
      difficulty: dto.difficulty ?? CourseDifficulty.BEGINNER,
      enrollmentType: dto.enrollmentType ?? EnrollmentType.OPEN,
    });
  }
}
