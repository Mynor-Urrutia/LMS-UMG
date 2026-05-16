import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY } from '../../domain/ports/course-repository.port';
import { CourseEntity } from '../../domain/entities/course.entity';
import { CreateCourseDto } from '../dtos/create-course.dto';
import { CourseDifficulty } from '../../../common/enums/course-difficulty.enum';
import { EnrollmentType } from '../../../common/enums/enrollment-type.enum';
import { slugify } from '../../../../common/utils/slugify';

@Injectable()
export class CreateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(teacherId: string, dto: CreateCourseDto): Promise<CourseEntity> {
    const raw = slugify(dto.title);
    if (!raw) throw new BadRequestException('Course title produces an empty slug');
    // ParseSlugPipe caps path params at 100 chars — keep stored slugs within the same limit
    const slug = raw.length > 100 ? raw.slice(0, 100).replace(/-+$/, '') : raw;

    // Slug uniqueness is enforced by the DB unique constraint — P2002 is caught in the adapter
    return this.courseRepo.create({
      teacherId,
      categoryId: dto.categoryId ?? null,
      title: dto.title,
      slug,
      description: dto.description ?? null,
      difficulty: dto.difficulty ?? CourseDifficulty.BEGINNER,
      enrollmentType: dto.enrollmentType ?? EnrollmentType.OPEN,
    });
  }
}
