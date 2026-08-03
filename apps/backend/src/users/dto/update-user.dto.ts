import { Transform } from 'class-transformer';
import {
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const normalizeUsername = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'ivan.petrov' })
  @IsOptional()
  @Transform(normalizeUsername)
  @Matches(/^[a-z0-9._-]{3,32}$/)
  username?: string;

  @ApiPropertyOptional({ example: 'Иван' })
  @IsOptional()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-zА-Яа-яЁё -]+$/)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Петров' })
  @IsOptional()
  @Transform(trim)
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-zА-Яа-яЁё -]+$/)
  lastName?: string;
}
