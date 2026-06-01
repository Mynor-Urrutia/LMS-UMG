import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IForumRepository,
  ICreateThreadData,
  ICreatePostData,
  ForumThreadWithCount,
  ForumThreadWithPosts,
} from '../../domain/ports/forum-repository.port';
import { ForumThreadEntity } from '../../domain/entities/forum-thread.entity';
import { ForumPostEntity } from '../../domain/entities/forum-post.entity';

const THREAD_SELECT = {
  id: true,
  courseId: true,
  authorId: true,
  title: true,
  isPinned: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
} as const;

const POST_SELECT = {
  id: true,
  threadId: true,
  authorId: true,
  parentId: true,
  content: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      profile: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

type ThreadRow = Prisma.ForumThreadGetPayload<{ select: typeof THREAD_SELECT }>;
type PostRow = Prisma.ForumPostGetPayload<{ select: typeof POST_SELECT }>;

function toThreadEntity(row: ThreadRow): ForumThreadEntity {
  return {
    id: row.id,
    courseId: row.courseId,
    authorId: row.authorId,
    title: row.title,
    isPinned: row.isPinned,
    isLocked: row.isLocked,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPostEntity(row: PostRow): ForumPostEntity {
  const firstName = row.author?.profile?.firstName ?? '';
  const lastName = row.author?.profile?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim() || null;
  return {
    id: row.id,
    threadId: row.threadId,
    authorId: row.deletedAt ? null : row.authorId,
    parentId: row.parentId,
    authorName: row.deletedAt ? null : fullName,
    content: row.deletedAt ? null : row.content,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaForumsAdapter implements IForumRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findThreadById(id: string): Promise<ForumThreadEntity | null> {
    const row = await this.prisma.forumThread.findUnique({ where: { id }, select: THREAD_SELECT });
    return row ? toThreadEntity(row) : null;
  }

  async findThreadsByCourse(courseId: string): Promise<ForumThreadWithCount[]> {
    const rows = await this.prisma.forumThread.findMany({
      where: { courseId },
      select: { ...THREAD_SELECT, _count: { select: { posts: { where: { deletedAt: null } } } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(row => ({ ...toThreadEntity(row), postCount: row._count.posts }));
  }

  async findThreadWithPosts(id: string): Promise<ForumThreadWithPosts | null> {
    const row = await this.prisma.forumThread.findUnique({
      where: { id },
      select: {
        ...THREAD_SELECT,
        posts: { where: { deletedAt: null }, select: POST_SELECT, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) return null;
    return { ...toThreadEntity(row), posts: row.posts.map(toPostEntity) };
  }

  async createThread(data: ICreateThreadData): Promise<ForumThreadEntity> {
    const row = await this.prisma.forumThread.create({
      data: { courseId: data.courseId, authorId: data.authorId, title: data.title },
      select: THREAD_SELECT,
    });
    return toThreadEntity(row);
  }

  async deleteThread(id: string): Promise<void> {
    try {
      await this.prisma.forumThread.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Thread not found');
      }
      throw err;
    }
  }

  async updateThread(id: string, data: Partial<Pick<ForumThreadEntity, 'isPinned' | 'isLocked'>>): Promise<ForumThreadEntity> {
    try {
      const row = await this.prisma.forumThread.update({
        where: { id },
        data: {
          ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
          ...(data.isLocked !== undefined && { isLocked: data.isLocked }),
        },
        select: THREAD_SELECT,
      });
      return toThreadEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Thread not found');
      }
      throw err;
    }
  }

  async findPostById(id: string): Promise<ForumPostEntity | null> {
    const row = await this.prisma.forumPost.findUnique({ where: { id }, select: POST_SELECT });
    return row ? toPostEntity(row) : null;
  }

  async createPost(data: ICreatePostData): Promise<ForumPostEntity> {
    const row = await this.prisma.forumPost.create({
      data: {
        threadId: data.threadId,
        authorId: data.authorId,
        content: data.content,
        ...(data.parentId && { parentId: data.parentId }),
      },
      select: POST_SELECT,
    });
    return toPostEntity(row);
  }

  async updatePost(id: string, content: string): Promise<ForumPostEntity> {
    try {
      const row = await this.prisma.forumPost.update({
        where: { id },
        data: { content },
        select: POST_SELECT,
      });
      return toPostEntity(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Post not found');
      }
      throw err;
    }
  }

  async softDeletePost(id: string): Promise<void> {
    try {
      await this.prisma.forumPost.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new NotFoundException('Post not found');
      }
      throw err;
    }
  }
}
