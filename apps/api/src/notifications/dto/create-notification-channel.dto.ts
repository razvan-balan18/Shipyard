import {
  IsString,
  IsEnum,
  IsIn,
  IsArray,
  IsObject,
  IsOptional,
  IsBoolean,
  MaxLength,
  ArrayNotEmpty,
} from 'class-validator';
import { ChannelType, Prisma } from '../../generated/prisma/client';
import { NotificationType } from '@shipyard/shared';

const VALID_EVENTS = Object.values(NotificationType);

export class CreateNotificationChannelDto {
  @IsEnum(ChannelType)
  type!: ChannelType;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsObject()
  config!: Prisma.InputJsonValue;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VALID_EVENTS, { each: true })
  events!: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
