export interface ForumThreadEntity {
  id: string;
  courseId: string;
  authorId: string | null;
  title: string;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
