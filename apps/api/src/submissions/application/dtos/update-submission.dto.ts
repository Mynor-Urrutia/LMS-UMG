import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateSubmissionDto {
  @IsOptional()
  @ValidateIf((o) => o.textContent !== null)
  @IsString()
  @MaxLength(50_000)
  textContent?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.fileAssetId !== null)
  @IsString()
  @Matches(/^c[a-z0-9]{24}$/, { message: 'fileAssetId must be a valid CUID' })
  fileAssetId?: string | null;
}
