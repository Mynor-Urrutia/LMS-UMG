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
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  DilemmaScenario,
  DilemmaChoice,
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
  SurveyQuestionType,
} from '@prisma/client';

