import { IsBoolean } from 'class-validator';

export class SetPinDto {
  @IsBoolean()
  isPinned: boolean;
}
