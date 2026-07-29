import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarListItemResponseDto } from './car-list-item-response.dto';

export class CarDetailsResponseDto extends CarListItemResponseDto {
  @ApiPropertyOptional({
    example: 'Documents require review',
    nullable: true,
  })
  blockedReason: string | null;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-07-29T09:45:00.000Z',
    nullable: true,
  })
  blockedAt: string | null;

  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
  })
  arrivalSiteId: string;

  @ApiPropertyOptional({
    example: 'Duplicate record',
    nullable: true,
  })
  archivedReason: string | null;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-08-01T10:00:00.000Z',
    nullable: true,
  })
  archivedAt: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-29T09:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-29T10:15:00.000Z',
  })
  updatedAt: string;
}
