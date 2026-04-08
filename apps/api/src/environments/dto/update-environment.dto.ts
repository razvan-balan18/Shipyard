import {
  IsString,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateEnvironmentDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  order?: number;

  @IsUrl()
  @IsOptional()
  url?: string;

  @IsUrl()
  @IsOptional()
  healthCheckUrl?: string;

  @IsInt()
  @IsOptional()
  @Min(5)
  @Max(3600)
  healthCheckInterval?: number;
}
