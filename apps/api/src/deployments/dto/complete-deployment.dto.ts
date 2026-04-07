import { IsIn } from 'class-validator';

export class CompleteDeploymentDto {
  @IsIn(['SUCCESS', 'FAILED'])
  status!: 'SUCCESS' | 'FAILED';
}
