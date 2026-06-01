import { ForumThreadEntity } from '../entities/forum-thread.entity';
import { ForumPostEntity } from '../entities/forum-post.entity';

export const FORUM_REPOSITORY = 'FORUM_REPOSITORY';

export interface ICreateThreadData {
  courseId: string;
  authorId: string;
  title: string;
}

export interface ICreatePostData {
  threadId: string;
  authorId: string;
  content: string;
  parentId?: string;
}

export interface ForumThreadWithCount extends ForumThreadEntity {
  postCount: number;
}

export interface ForumThreadWithPosts extends ForumThreadEntity {
  posts: ForumPostEntity[];
}

export interface IForumRepository {
  findThreadById(id: string): Promise<ForumThreadEntity | null>;
  findThreadsByCourse(courseId: string): Promise<ForumThreadWithCount[]>;
  findThreadWithPosts(id: string): Promise<ForumThreadWithPosts | null>;
  createThread(data: ICreateThreadData): Promise<ForumThreadEntity>;
  deleteThread(id: string): Promise<void>;
  updateThread(id: string, data: Partial<Pick<ForumThreadEntity, 'isPinned' | 'isLocked'>>): Promise<ForumThreadEntity>;
  findPostById(id: string): Promise<ForumPostEntity | null>;
  createPost(data: ICreatePostData): Promise<ForumPostEntity>;
  updatePost(id: string, content: string): Promise<ForumPostEntity>;
  softDeletePost(id: string): Promise<void>;
}
