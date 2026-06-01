import { IsEnum, IsString } from 'class-validator';
import { AttendanceStatus } from '../../domain/entities/attendance.entity';

export class UpsertRecordDto {
  @IsString()
  studentId: string;

  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status: AttendanceStatus;
}
