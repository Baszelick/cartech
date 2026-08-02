import { ApiProperty } from '@nestjs/swagger';

export class SiteResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '6fb95e2c-9440-4d9b-82a2-780af81be53c',
    description: 'Идентификатор площадки.',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор родительской локации.',
  })
  locationId: string;

  @ApiProperty({
    example: 'Основная площадка',
    description: 'Название площадки.',
  })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Признак активности площадки.',
  })
  isActive: boolean;
}
