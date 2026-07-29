import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatteryCheckResponseDto {
  @ApiProperty({
    example: 'c3c4c321-8c16-4bbc-bc29-97f953785d92',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    example: '80ad46f0-d89f-46ce-a92a-e11c4dfc2714',
    format: 'uuid',
  })
  carId: string;

  @ApiProperty({
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    format: 'uuid',
  })
  checkedById: string;

  @ApiProperty({ example: '2026-07-29', format: 'date' })
  checkedOn: string;

  @ApiPropertyOptional({
    example: 12.6,
    nullable: true,
    description: 'Напряжение аккумулятора в вольтах.',
  })
  voltage: number | null;

  @ApiPropertyOptional({
    example: 'Норма',
    nullable: true,
    description: 'Комментарий к проверке.',
  })
  comment: string | null;

  @ApiProperty({
    example: '2026-07-29T10:15:00.000Z',
    format: 'date-time',
  })
  createdAt: string;
}
