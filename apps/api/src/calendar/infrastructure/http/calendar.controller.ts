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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ParseCuidPipe } from '../../../common/pipes/parse-cuid.pipe';
import { CreateEventDto } from '../../application/dtos/create-event.dto';
import { UpdateEventDto } from '../../application/dtos/update-event.dto';
import { CreateEventUseCase } from '../../application/use-cases/create-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case';
import { GetEventUseCase } from '../../application/use-cases/get-event.use-case';
import { UpdateEventUseCase } from '../../application/use-cases/update-event.use-case';
import { DeleteEventUseCase } from '../../application/use-cases/delete-event.use-case';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly listEventsUseCase: ListEventsUseCase,
    private readonly getEventUseCase: GetEventUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly deleteEventUseCase: DeleteEventUseCase,
  ) {}

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a calendar event (teacher or admin)' })
  create(@Body() dto: CreateEventDto, @CurrentUser() user: JwtPayload) {
    return this.createEventUseCase.execute(dto, user.sub, user.role as UserRole);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List calendar events (optional filters: courseId, from, to)' })
  list(
    @CurrentUser() user: JwtPayload,
    @Query('courseId') courseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.listEventsUseCase.execute(user.sub, user.role as UserRole, courseId, from, to);
  }

  @Get(':eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a calendar event by ID' })
  getOne(
    @Param('eventId', ParseCuidPipe) eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getEventUseCase.execute(eventId, user.sub, user.role as UserRole);
  }

  @Patch(':eventId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a calendar event (creator or admin)' })
  update(
    @Param('eventId', ParseCuidPipe) eventId: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateEventUseCase.execute(eventId, dto, user.sub, user.role as UserRole);
  }

  @Delete(':eventId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a calendar event (creator or admin)' })
  async remove(
    @Param('eventId', ParseCuidPipe) eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteEventUseCase.execute(eventId, user.sub, user.role as UserRole);
  }
}
