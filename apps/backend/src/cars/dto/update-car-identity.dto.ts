import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import {
  FULL_VIN_PATTERN,
  normalizeCarIdentifier,
  SHORT_VIN_PATTERN,
} from '../../common/car-identity';

export class UpdateCarIdentityDto {
  @ApiPropertyOptional({
    example: 'ABC123',
    minLength: 6,
    maxLength: 6,
    pattern: '^[A-Z0-9]{6}$',
    description:
      'Новый обязательный shortVin. Значение trim/uppercase; null и пустая строка запрещены.',
  })
  @Transform(({ value }) => normalizeCarIdentifier(value))
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(SHORT_VIN_PATTERN)
  shortVin?: string;

  @ApiPropertyOptional({
    example: 'XW8ED41P21K123456',
    nullable: true,
    minLength: 6,
    maxLength: 17,
    pattern: '^[A-HJ-NPR-Z0-9]{6,17}$',
    description:
      'Новый полный VIN. Значение trim/uppercase; null очищает поле; I, O и Q запрещены.',
  })
  @Transform(({ value }) => normalizeCarIdentifier(value))
  @IsOptional()
  @IsString()
  @Matches(FULL_VIN_PATTERN)
  vin?: string | null;
}
