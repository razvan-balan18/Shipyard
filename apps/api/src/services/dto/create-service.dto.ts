import {
  IsString,
  IsUrl,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RepositoryProvider } from '@shipyard/shared';

export class CreateServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsUrl()
  repositoryUrl!: string;

  @IsEnum(RepositoryProvider)
  repositoryProvider!: RepositoryProvider;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  dockerImage?: string;
}
