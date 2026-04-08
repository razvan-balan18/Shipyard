import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
