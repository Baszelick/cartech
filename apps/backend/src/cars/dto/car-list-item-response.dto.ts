import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarLifecycleStatus } from '../../../generated/prisma/enums';

export class CarListItemResponseDto {
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

  @ApiProperty({
    example: '123456',
    pattern: '^[A-Z0-9]{6}$',
    description: 'Обязательный рабочий идентификатор автомобиля.',
  })
  shortVin: string;

  @ApiProperty({
    example: false,
    description:
      'True, если в этой же компании существует другая машина с таким shortVin.',
  })
  hasShortVinDuplicate: boolean;

  @ApiProperty({ example: 'Jetour' })
  brand: string;

  @ApiProperty({ example: 'X70 Plus' })
  model: string;

  @ApiPropertyOptional({ example: 'Белый', nullable: true })
  color: string | null;

  @ApiProperty({ format: 'date', example: '2026-07-29' })
  arrivedOn: string;

  @ApiProperty({
    enum: CarLifecycleStatus,
    example: CarLifecycleStatus.ACTIVE,
    description:
      'Жизненный цикл автомобиля: ACTIVE — в работе, ISSUED — выдан, ARCHIVED — сохранён вне активных операций.',
  })
  lifecycleStatus: CarLifecycleStatus;

  @ApiProperty({ example: false })
  isBlocked: boolean;

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
}
