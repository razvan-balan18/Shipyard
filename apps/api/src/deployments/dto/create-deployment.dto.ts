import {
  IsString,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateDeploymentDto {
  @IsUUID()
  serviceId!: string;

  @IsUUID()
  environmentId!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(40)
  commitSha!: string;

  @IsString()
  @MaxLength(500)
  commitMessage!: string;

  @IsString()
  @MaxLength(200)
  branch!: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  imageTag?: string;

  @IsUUID()
  @IsOptional()
  pipelineRunId?: string;
}
