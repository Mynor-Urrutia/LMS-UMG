import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'parentId must be a valid CUID' })
  parentId?: string;
}
