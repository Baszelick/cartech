import { ApiProperty } from '@nestjs/swagger';

export class LocationResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор локации.',
  })
  id: string;

  @ApiProperty({
    example: 'MSK',
    description: 'Код локации, уникальный в рамках компании.',
  })
  code: string;

  @ApiProperty({
    example: 'Москва',
    description: 'Название локации.',
  })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Признак активности локации.',
  })
  isActive: boolean;
}
