import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { NotificationType } from '../../../common/enums/notification-type.enum';

export class CreateNotificationDto {
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'userId must be a valid CUID' })
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;
}
