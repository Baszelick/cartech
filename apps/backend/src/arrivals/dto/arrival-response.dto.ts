import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ArrivedCarResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
  })
  id: string;

  @ApiPropertyOptional({
    example: 'XW8ED41P21K123456',
    nullable: true,
    pattern: '^[A-HJ-NPR-Z0-9]{6,17}$',
  })
  vin: string | null;

  @ApiProperty({ example: '123456' })
  shortVin: string;

  @ApiProperty({
    example: false,
    description:
      'True, если в этой же компании существует другая машина с таким shortVin.',
  })
  hasShortVinDuplicate: boolean;

  @ApiProperty({ example: 'Toyota' })
  brand: string;

  @ApiProperty({ example: 'Camry' })
  model: string;

  @ApiPropertyOptional({ example: 'Чёрный', nullable: true })
  color: string | null;

  @ApiProperty({ format: 'date', example: '2026-07-29' })
  arrivedOn: string;

  @ApiProperty({
    enum: ['ACTIVE'],
    example: 'ACTIVE',
    description:
      'Новые принятые автомобили получают статус жизненного цикла ACTIVE.',
  })
  lifecycleStatus: 'ACTIVE';

  @ApiProperty({
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
  })
  ownerLocationId: string;

  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
  })
  currentSiteId: string;

  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
  })
  arrivalSiteId: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-29T10:15:00.000Z',
  })
  createdAt: string;
}

export class CreateArrivalResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Количество автомобилей, созданных операцией.',
  })
  count: number;

  @ApiProperty({ type: [ArrivedCarResponseDto] })
  cars: ArrivedCarResponseDto[];
}
