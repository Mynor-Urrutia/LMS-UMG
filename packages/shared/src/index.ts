// Re-export Prisma client and types
export { PrismaClient, Prisma } from '@prisma/client';
export type {
  User,
  Profile,
  Course,
  CourseModule,
  Lesson,
  Enrollment,
  LessonProgress,
  Assignment,
  QuizQuestion,
  Submission,
  Grade,
  Badge,
  UserBadge,
  UserXp,
  XpTransaction,
  Notification,
  ForumThread,
  ForumPost,
  FileAsset,
  AuditLog,
  RefreshToken,
  CourseCategory,
  CalendarEvent,
} from '@prisma/client';

// Re-export enums
export {
  Role,
  UserStatus,
  CourseStatus,
  Difficulty,
  EnrollmentType,
  EnrollmentStatus,
  LessonType,
  AssignmentType,
  BadgeCriteria,
  NotificationType,
  SubmissionStatus,
} from '@prisma/client';
