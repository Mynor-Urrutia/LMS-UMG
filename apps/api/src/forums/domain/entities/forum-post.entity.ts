export interface ForumPostEntity {
  id: string;
  threadId: string;
  authorId: string | null;
  parentId: string | null;
  authorName: string | null;
  content: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
