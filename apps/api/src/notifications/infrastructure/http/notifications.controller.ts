import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { ListNotificationsUseCase } from '../../application/use-cases/list-notifications.use-case';
import { MarkReadUseCase } from '../../application/use-cases/mark-read.use-case';
import { MarkAllReadUseCase } from '../../application/use-cases/mark-all-read.use-case';
import { DeleteNotificationUseCase } from '../../application/use-cases/delete-notification.use-case';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markReadUseCase: MarkReadUseCase,
    private readonly markAllReadUseCase: MarkAllReadUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List own notifications (most recent first)' })
  list(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    const n = limit !== undefined ? parseInt(limit, 10) : NaN;
    const parsedLimit = Number.isNaN(n) || n < 1 ? undefined : n;
    return this.listNotificationsUseCase.execute(user.sub, parsedLimit);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    await this.markAllReadUseCase.execute(user.sub, user.sub);
  }

  @Patch(':notificationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(
    @Param('notificationId', ParseCuidPipe) notificationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.markReadUseCase.execute(notificationId, user.sub);
  }

  @Delete(':notificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(
    @Param('notificationId', ParseCuidPipe) notificationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteNotificationUseCase.execute(notificationId, user.sub);
  }
}
