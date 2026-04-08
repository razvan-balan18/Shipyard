import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@shipyard/shared';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}
