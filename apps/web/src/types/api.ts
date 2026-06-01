export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EnrollmentType = 'OPEN' | 'INVITATION' | 'APPROVAL';
export type EnrollmentStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: CourseDifficulty;
  enrollmentType: EnrollmentType;
  status: CourseStatus;
  category: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string } | null;
  _count?: { modules: number };
}

export interface CourseModule {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'TEXT' | 'VIDEO' | 'FILE' | 'EMBED' | 'INFOGRAPHIC' | 'CASE_STUDY';
  order: number;
  isPublished: boolean;
  content?: string | null;
  videoUrl?: string | null;
  fileAssetId?: string | null;
  embedUrl?: string | null;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export interface EnrollmentWithStudent {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  student: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface CourseProgress {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: string;
  enrollmentStatus: 'ACTIVE' | 'COMPLETED';
  totalLessons: number;
  completedLessons: number;
}

export interface StudentDashboard {
  userId: string;
  totalXp: number;
  level?: number;
  badgeCount: number;
  courses: CourseProgress[];
}

export interface TeacherCourseStats {
  courseId: string;
  title: string;
  slug: string;
  status: CourseStatus;
  activeStudentCount: number;
  pendingGradeCount: number;
}

export interface TeacherDashboard {
  userId: string;
  courses: TeacherCourseStats[];
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  group: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  baseRole: UserRole;
  isSystem: boolean;
  color: string | null;
  icon: string | null;
  permissions: string[];
  createdAt: string;
}

export type AssignmentType = 'TEXT' | 'FILE' | 'QUIZ' | 'DILEMMA';

export interface Assignment {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  type: AssignmentType;
  dueDate: string | null;
  allowLate: boolean;
  maxScore: number;
  weight: number;
  createdAt: string;
}

export type QuestionType = 'TEXT' | 'MCQ' | 'TRUE_FALSE';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  order: number;
}

export interface EvaluationQuestion {
  id: string;
  evaluationId: string;
  text: string;
  type: QuestionType;
  points: number;
  order: number;
  options: QuestionOption[];
}

export interface Evaluation {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  totalPoints: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationWithQuestions extends Evaluation {
  questions: EvaluationQuestion[];
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  type: QuestionType;
  points: number;
  earnedPoints: number | null;
  isPending: boolean;
  textAnswer: string | null;
  selectedIds: string[] | null;
  correctIds: string[] | null;
}

export interface AttemptResult {
  attemptId: string;
  evaluationId: string;
  evaluationTitle: string;
  totalPoints: number;
  score: number | null;
  percentage: number | null;
  feedback: string | null;
  hasPendingQuestions: boolean;
  submittedAt: string;
  questions: QuestionResult[];
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
}

export interface AttendanceSessionWithRecords extends AttendanceSession {
  records: AttendanceRecord[];
}

export interface MyAttendanceEntry {
  sessionId: string;
  date: string;
  status: AttendanceStatus;
}

export interface ForumThread {
  id: string;
  courseId: string;
  authorId: string | null;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProgressGrade {
  assignmentId: string;
  assignmentTitle: string;
  score: number | null;
  maxScore: number;
}

export interface StudentProgressEvaluationGrade {
  evaluationId: string;
  evaluationTitle: string;
  score: number | null;
  maxScore: number;
}

export interface StudentProgress {
  enrollmentId: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  submittedAssignments: number;
  totalAssignments: number;
  grades: StudentProgressGrade[];
  evaluationGrades: StudentProgressEvaluationGrade[];
  overallGrade: number | null;
  totalXp: number;
}

export interface Submission {
  id: string;
  studentId: string;
  assignmentId: string;
  textContent: string | null;
  filePath: string | null;
  fileAssetId: string | null;
  isLate: boolean;
  submittedAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string | null;
  parentId: string | null;
  authorName: string | null;
  content: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionWithStudentInfo extends Submission {
  studentFirstName: string;
  studentLastName: string;
  studentEmail: string;
  grade: { id: string; score: number; maxScore: number; feedback: string | null } | null;
}

export interface StudentCourseDetailAssignment {
  id: string;
  title: string;
  type: AssignmentType;
  maxScore: number;
  weight: number;
  dueDate: string | null;
  submission: { id: string; textContent: string | null; fileAssetId: string | null; submittedAt: string; isLate: boolean } | null;
  grade: { id: string; score: number; maxScore: number; feedback: string | null } | null;
}

export interface StudentCourseDetail {
  student: { id: string; email: string; firstName: string; lastName: string; bio: string | null };
  enrollment: { id: string; status: EnrollmentStatus; enrolledAt: string };
  progress: { percentage: number; completedLessons: number; totalLessons: number };
  assignments: StudentCourseDetailAssignment[];
}

export interface ForumThreadWithPosts extends ForumThread {
  posts: ForumPost[];
}

export interface CourseAnnouncement {
  id: string;
  courseId: string;
  authorId: string | null;
  authorName: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicItem {
  id: string;
  name: string;
  order?: number;
}

export type NotificationType =
  | 'GRADE_POSTED'
  | 'BADGE_EARNED'
  | 'ENROLLMENT_APPROVED'
  | 'ENROLLMENT_REJECTED'
  | 'NEW_LESSON'
  | 'ASSIGNMENT_DUE_SOON'
  | 'FORUM_REPLY'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export type BadgeCriteria = 'COURSE_COMPLETE' | 'PERFECT_QUIZ' | 'FIRST_ENROLLMENT' | 'STREAK' | 'MANUAL';

export interface BadgeItem {
  id: string;
  courseId: string | null;
  name: string;
  description: string | null;
  iconPath: string | null;
  criteriaType: BadgeCriteria;
  createdAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  badge: BadgeItem;
}

export interface UserXp {
  userId: string;
  totalXp: number;
}

export interface XpTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actor: { id: string; email: string } | null;
  entityType: string;
  entityId: string | null;
  action: string;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogPage {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface CourseReview {
  id: string;
  courseId: string;
  studentId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  student: { id: string; firstName: string; lastName: string } | null;
}

export interface ReviewsResult {
  items: CourseReview[];
  total: number;
  avgRating: number | null;
}

export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  totalXp: number;
  level: number;
}

export type SurveyQuestionType = 'MULTIPLE_CHOICE' | 'TEXT' | 'LIKERT' | 'YES_NO';

export interface Survey {
  id: string;
  courseId: string | null;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  isOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  text: string;
  type: SurveyQuestionType;
  options: string[] | null;
  order: number;
}

export interface SurveyWithQuestions {
  survey: Survey;
  questions: SurveyQuestion[];
}

export interface SurveyResultItem {
  questionId: string;
  text: string;
  type: SurveyQuestionType;
  options: string[] | null;
  totalResponses: number;
  textAnswers: string[];
  optionCounts: number[];
}

export interface DilemmaChoice {
  id: string;
  scenarioId: string;
  text: string;
  consequence: string;
  ethicalScore: number;
  order: number;
}

export interface DilemmaScenario {
  id: string;
  assignmentId: string;
  scenario: string;
  choices: DilemmaChoice[];
  createdAt: string;
  updatedAt: string;
}

export type BadgeCriteria2 = BadgeCriteria | 'LEVEL_UP';

export interface CourseModuleExtended extends CourseModule {
  prerequisiteModuleId: string | null;
  isLocked?: boolean;
}
