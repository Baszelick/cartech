import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ArrivalCarDto {
  @ApiProperty({
    example: 'XW8ED41P21K123456',
    minLength: 6,
    maxLength: 17,
    description: 'Full vehicle identification number.',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(17)
  vin: string;

  @ApiProperty({
    example: '123456',
    minLength: 1,
    maxLength: 17,
    description:
      'Explicit short VIN representation; its derivation rule is not yet defined.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(17)
  shortVin: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'Camry' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;
}

export class CreateArrivalDto {
  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
    description: 'Site where the cars are accepted.',
  })
  @IsUUID()
  arrivalSiteId: string;

  @ApiProperty({
    format: 'date',
    example: '2026-07-29',
    description: 'Arrival business date.',
  })
  @IsDateString()
  arrivedOn: string;

  @ApiProperty({
    type: [ArrivalCarDto],
    minItems: 1,
    description: 'Cars created atomically by this operation.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ArrivalCarDto)
  cars: ArrivalCarDto[];
}
