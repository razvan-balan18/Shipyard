import {
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateEnvironmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  order!: number;

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

  @IsUUID()
  serviceId!: string;
}
