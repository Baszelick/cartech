import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarLifecycleStatus } from '../../../generated/prisma/enums';

export class VehicleIssueResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '19c90c1c-44b2-4bcf-b9df-68dc4de9a674',
    description: 'Идентификатор выдачи автомобиля.',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор выданного автомобиля.',
  })
  carId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'b35ddc51-d22c-4945-b210-3b3754c56192',
    nullable: true,
    description:
      'Связанная запись планирования выдачи. Для текущего MVP endpoint не заполняется.',
  })
  appointmentId: string | null;

  @ApiProperty({
    format: 'date',
    example: '2026-08-01',
    description: 'Дата выдачи, установленная сервером.',
  })
  issuedOn: string;

  @ApiProperty({
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Пользователь, выполнивший выдачу.',
  })
  issuedById: string;

  @ApiProperty({
    enum: CarLifecycleStatus,
    example: CarLifecycleStatus.ISSUED,
    description: 'Новый lifecycle-статус автомобиля после выдачи.',
  })
  lifecycleStatus: CarLifecycleStatus;

  @ApiProperty({
    format: 'date-time',
    example: '2026-08-01T10:15:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-08-01T10:15:00.000Z',
  })
  updatedAt: string;
}
