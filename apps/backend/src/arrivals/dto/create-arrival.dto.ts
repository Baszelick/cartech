import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  FULL_VIN_PATTERN,
  normalizeCarIdentifier,
  SHORT_VIN_PATTERN,
} from '../../common/car-identity';

export class ArrivalCarDto {
  @ApiPropertyOptional({
    example: 'XW8ED41P21K123456',
    nullable: true,
    minLength: 6,
    maxLength: 17,
    pattern: '^[A-HJ-NPR-Z0-9]{6,17}$',
    description:
      'Необязательный полный VIN. Значение trim/uppercase; буквы I, O и Q запрещены.',
  })
  @Transform(({ value }) => normalizeCarIdentifier(value))
  @IsOptional()
  @IsString()
  @Matches(FULL_VIN_PATTERN)
  vin?: string | null;

  @ApiProperty({
    example: '123456',
    minLength: 6,
    maxLength: 6,
    pattern: '^[A-Z0-9]{6}$',
    description:
      'Обязательный рабочий идентификатор. Значение trim/uppercase; совпадения разрешены.',
  })
  @Transform(({ value }) => normalizeCarIdentifier(value))
  @IsString()
  @Matches(SHORT_VIN_PATTERN)
  shortVin: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiPropertyOptional({ example: 'Чёрный' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;
}

export class CreateArrivalDto {
  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
    description: 'Площадка, на которой принимают автомобили.',
  })
  @IsUUID()
  arrivalSiteId: string;

  @ApiProperty({
    format: 'date',
    example: '2026-07-29',
    description: 'Дата приёмки по бизнес-календарю.',
  })
  @IsDateString()
  arrivedOn: string;

  @ApiProperty({
    type: [ArrivalCarDto],
    minItems: 1,
    description: 'Автомобили, атомарно создаваемые этой операцией.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ArrivalCarDto)
  cars: ArrivalCarDto[];
}
