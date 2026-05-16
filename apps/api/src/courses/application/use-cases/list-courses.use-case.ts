import { Inject, Injectable } from '@nestjs/common';
import { ICourseRepository, COURSE_REPOSITORY, PaginatedCourses } from '../../domain/ports/course-repository.port';
import { ListCoursesDto } from '../dtos/list-courses.dto';
import { CourseStatus } from '../../../common/enums/course-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';

@Injectable()
export class ListCoursesUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
  ) {}

  async execute(dto: ListCoursesDto, requesterId: string, requesterRole: UserRole): Promise<PaginatedCourses> {
    const isAdmin = requesterRole === UserRole.ADMIN;
    const isTeacher = requesterRole === UserRole.TEACHER;

    let effectiveStatus = dto.status;
    let effectiveTeacherId = dto.teacherId;

    if (!isAdmin) {
      if (isTeacher) {
        if (dto.teacherId && dto.teacherId !== requesterId) {
          // Browsing another teacher's courses: only PUBLISHED visible
          effectiveStatus = CourseStatus.PUBLISHED;
        } else if (!dto.teacherId && !dto.status) {
          // Default browse (no filter): show all PUBLISHED courses from everyone
          effectiveStatus = CourseStatus.PUBLISHED;
        } else if (!dto.teacherId && dto.status && dto.status !== CourseStatus.PUBLISHED) {
          // Non-PUBLISHED status requested without explicit teacherId:
          // scope to own courses — prevents leaking other teachers' drafts/archives
          effectiveTeacherId = requesterId;
        }
        // If teacherId === requesterId: own courses at any status, pass through
      } else {
        // Students see only PUBLISHED courses; their teacherId filter is preserved
        effectiveStatus = CourseStatus.PUBLISHED;
      }
    }

    return this.courseRepo.findAll({
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
      status: effectiveStatus,
      categoryId: dto.categoryId,
      difficulty: dto.difficulty,
      teacherId: effectiveTeacherId,
      search: dto.search,
    });
  }
}
