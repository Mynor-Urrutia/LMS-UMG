import { CourseAnnouncementEntity } from '../entities/course-announcement.entity';

export const ANNOUNCEMENT_REPOSITORY = 'ANNOUNCEMENT_REPOSITORY';

export interface ICreateAnnouncementData {
  courseId: string;
  authorId: string;
  title: string;
  content: string;
}

export interface IAnnouncementRepository {
  create(data: ICreateAnnouncementData): Promise<CourseAnnouncementEntity>;
  findByCourse(courseId: string): Promise<CourseAnnouncementEntity[]>;
  findById(id: string): Promise<CourseAnnouncementEntity | null>;
  delete(id: string): Promise<void>;
}
