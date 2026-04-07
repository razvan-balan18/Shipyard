import {
  IsString,
  IsUrl,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RepositoryProvider } from '@shipyard/shared';

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @IsEnum(RepositoryProvider)
  @IsOptional()
  repositoryProvider?: RepositoryProvider;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  dockerImage?: string;
}
