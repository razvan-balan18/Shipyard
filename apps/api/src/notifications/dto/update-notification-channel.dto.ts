import {
  IsString,
  IsIn,
  IsArray,
  IsObject,
  IsOptional,
  IsBoolean,
  MaxLength,
  ArrayNotEmpty,
} from 'class-validator';
import { Prisma } from '../../generated/prisma/client';
import { NotificationType } from '@shipyard/shared';

const VALID_EVENTS = Object.values(NotificationType);

export class UpdateNotificationChannelDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  config?: Prisma.InputJsonValue;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VALID_EVENTS, { each: true })
  @IsOptional()
  events?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
