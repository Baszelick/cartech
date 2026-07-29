import { ApiProperty } from '@nestjs/swagger';

export class CarDetailsResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор автомобиля',
  })
  id: string;

  @ApiProperty({
    example: 'XW8ED41P21K123456',
    description: 'Полный VIN автомобиля',
  })
  vin: string;

  @ApiProperty({
    example: '123456',
    description: 'Короткий VIN автомобиля',
  })
  shortVin: string;

  @ApiProperty({
    example: 'Jetour',
    description: 'Марка автомобиля',
  })
  brand: string;

  @ApiProperty({
    example: 'X70 Plus',
    description: 'Модель автомобиля',
  })
  model: string;

  @ApiProperty({
    example: 'Белый',
    nullable: true,
    description: 'Цвет автомобиля',
  })
  color: string | null;

  @ApiProperty({
    type: String,
    format: 'date',
    example: '2026-07-29',
    description: 'Дата поступления автомобиля',
  })
  arrivedOn: string;

  @ApiProperty({
    enum: ['ACTIVE', 'ISSUED', 'ARCHIVED'],
    example: 'ACTIVE',
    description: 'Статус жизненного цикла автомобиля',
  })
  lifecycleStatus: 'ACTIVE' | 'ISSUED' | 'ARCHIVED';

  @ApiProperty({
    example: false,
    description: 'Признак блокировки автомобиля',
  })
  isBlocked: boolean;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Причина блокировки автомобиля',
  })
  blockedReason: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: null,
    nullable: true,
    description: 'Дата и время блокировки автомобиля',
  })
  blockedAt: string | null;

  @ApiProperty({
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор локации-владельца',
  })
  ownerLocationId: string;

  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
    description: 'Идентификатор текущей площадки',
  })
  currentSiteId: string;

  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
    description: 'Идентификатор площадки поступления',
  })
  arrivalSiteId: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Причина архивирования автомобиля',
  })
  archivedReason: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: null,
    nullable: true,
    description: 'Дата и время архивирования автомобиля',
  })
  archivedAt: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-29T09:30:00.000Z',
    description: 'Дата и время создания записи',
  })
  createdAt: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-29T10:15:00.000Z',
    description: 'Дата и время последнего изменения записи',
  })
  updatedAt: string;
}
