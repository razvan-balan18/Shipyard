import { IsEnum } from 'class-validator';
import { UserRole } from '@shipyard/shared';

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: 'ADMIN' | 'MEMBER' | 'VIEWER';
}
