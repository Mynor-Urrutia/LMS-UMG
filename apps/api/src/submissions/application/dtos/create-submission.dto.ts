import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  textContent?: string;

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'fileAssetId must be a valid CUID' })
  fileAssetId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'choiceId must be a valid CUID' })
  choiceId?: string;
}
