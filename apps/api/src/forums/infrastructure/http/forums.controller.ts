import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateThreadDto } from '../../application/dtos/create-thread.dto';
import { CreatePostDto } from '../../application/dtos/create-post.dto';
import { UpdatePostDto } from '../../application/dtos/update-post.dto';
import { SetPinDto } from '../../application/dtos/set-pin.dto';
import { SetLockDto } from '../../application/dtos/set-lock.dto';
import { CreateThreadUseCase } from '../../application/use-cases/create-thread.use-case';
import { ListThreadsUseCase } from '../../application/use-cases/list-threads.use-case';
import { GetThreadUseCase } from '../../application/use-cases/get-thread.use-case';
import { DeleteThreadUseCase } from '../../application/use-cases/delete-thread.use-case';
import { PinThreadUseCase } from '../../application/use-cases/pin-thread.use-case';
import { LockThreadUseCase } from '../../application/use-cases/lock-thread.use-case';
import { CreatePostUseCase } from '../../application/use-cases/create-post.use-case';
import { UpdatePostUseCase } from '../../application/use-cases/update-post.use-case';
import { DeletePostUseCase } from '../../application/use-cases/delete-post.use-case';

@ApiTags('forums')
@Controller('courses/:courseId/threads')
export class ForumThreadsController {
  constructor(
    private readonly createThreadUseCase: CreateThreadUseCase,
    private readonly listThreadsUseCase: ListThreadsUseCase,
    private readonly getThreadUseCase: GetThreadUseCase,
    private readonly deleteThreadUseCase: DeleteThreadUseCase,
    private readonly pinThreadUseCase: PinThreadUseCase,
    private readonly lockThreadUseCase: LockThreadUseCase,
    private readonly createPostUseCase: CreatePostUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a forum thread in a course' })
  createThread(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Body() dto: CreateThreadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createThreadUseCase.execute(courseId, dto, user.sub, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List forum threads in a course (pinned first)' })
  listThreads(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listThreadsUseCase.execute(courseId, user.sub, user.role as UserRole);
  }

  @Get(':threadId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a thread with all posts' })
  getThread(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('threadId', ParseCuidPipe) threadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getThreadUseCase.execute(courseId, threadId, user.sub, user.role as UserRole);
  }

  @Delete(':threadId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a thread (author, course teacher, or admin)' })
  async deleteThread(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('threadId', ParseCuidPipe) threadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteThreadUseCase.execute(courseId, threadId, user.sub, user.role as UserRole);
  }

  @Patch(':threadId/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set pin state on a thread (teacher or admin)' })
  pinThread(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('threadId', ParseCuidPipe) threadId: string,
    @Body() dto: SetPinDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pinThreadUseCase.execute(courseId, threadId, dto.isPinned, user.sub, user.role as UserRole);
  }

  @Patch(':threadId/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set lock state on a thread (teacher or admin)' })
  lockThread(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('threadId', ParseCuidPipe) threadId: string,
    @Body() dto: SetLockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lockThreadUseCase.execute(courseId, threadId, dto.isLocked, user.sub, user.role as UserRole);
  }

  @Post(':threadId/posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a reply to a thread' })
  createPost(
    @Param('courseId', ParseCuidPipe) courseId: string,
    @Param('threadId', ParseCuidPipe) threadId: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.createPostUseCase.execute(courseId, threadId, dto, user.sub, user.role as UserRole);
  }
}

@ApiTags('forum-posts')
@Controller('posts')
export class ForumPostsController {
  constructor(
    private readonly updatePostUseCase: UpdatePostUseCase,
    private readonly deletePostUseCase: DeletePostUseCase,
  ) {}

  @Patch(':postId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a forum post (author only)' })
  updatePost(
    @Param('postId', ParseCuidPipe) postId: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updatePostUseCase.execute(postId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a forum post (author, course teacher, or admin)' })
  async deletePost(
    @Param('postId', ParseCuidPipe) postId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deletePostUseCase.execute(postId, user.sub, user.role as UserRole);
  }
}
