import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';
import {
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS,
} from '../../auth/password-policy';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const normalizeUsername = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateUserDto {
  @ApiProperty({ example: 'technician' })
  @Transform(normalizeUsername)
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9._-]{3,32}$/)
  username: string;

  @ApiProperty({ example: 'Иван' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-zА-Яа-яЁё -]+$/)
  firstName: string;

  @ApiProperty({ example: 'Петров' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-zА-Яа-яЁё -]+$/)
  lastName: string;

  @ApiProperty({
    example: 'Tech2026',
    description: PASSWORD_REQUIREMENTS,
    writeOnly: true,
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS })
  temporaryPassword: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    minItems: 1,
    example: [UserRole.TECHNICIAN],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];

  @ApiProperty({
    type: String,
    isArray: true,
    minItems: 1,
    format: 'uuid',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  locationIds: string[];
}
