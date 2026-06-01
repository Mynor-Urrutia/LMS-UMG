import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { FORUM_REPOSITORY } from './domain/ports/forum-repository.port';
import { PrismaForumsAdapter } from './infrastructure/adapters/prisma-forums.adapter';
import { CreateThreadUseCase } from './application/use-cases/create-thread.use-case';
import { ListThreadsUseCase } from './application/use-cases/list-threads.use-case';
import { GetThreadUseCase } from './application/use-cases/get-thread.use-case';
import { DeleteThreadUseCase } from './application/use-cases/delete-thread.use-case';
import { PinThreadUseCase } from './application/use-cases/pin-thread.use-case';
import { LockThreadUseCase } from './application/use-cases/lock-thread.use-case';
import { CreatePostUseCase } from './application/use-cases/create-post.use-case';
import { UpdatePostUseCase } from './application/use-cases/update-post.use-case';
import { DeletePostUseCase } from './application/use-cases/delete-post.use-case';
import { ForumThreadsController, ForumPostsController } from './infrastructure/http/forums.controller';

@Module({
  imports: [PrismaModule, CoursesModule, EnrollmentsModule],
  controllers: [ForumThreadsController, ForumPostsController],
  providers: [
    { provide: FORUM_REPOSITORY, useClass: PrismaForumsAdapter },
    CreateThreadUseCase,
    ListThreadsUseCase,
    GetThreadUseCase,
    DeleteThreadUseCase,
    PinThreadUseCase,
    LockThreadUseCase,
    CreatePostUseCase,
    UpdatePostUseCase,
    DeletePostUseCase,
  ],
})
export class ForumsModule {}
