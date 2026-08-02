import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PsoStatus } from '../../../generated/prisma/enums';

export class PsoResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '514828ed-a907-46c4-87b4-c8b486b5cfaa',
    description: 'Идентификатор предпродажной подготовки.',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    description: 'Идентификатор автомобиля.',
  })
  carId: string;

  @ApiProperty({
    enum: PsoStatus,
    example: PsoStatus.COMPLETED,
    description:
      'Состояние предпродажной подготовки: PENDING — ожидает завершения, COMPLETED — завершена.',
  })
  status: PsoStatus;

  @ApiProperty({
    format: 'date',
    example: '2026-08-05',
    description: 'Установленный срок завершения предпродажной подготовки.',
  })
  deadlineOn: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-07-31',
    nullable: true,
    description: 'Дата завершения, установленная сервером.',
  })
  completedOn: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    nullable: true,
    description: 'Пользователь, завершивший предпродажную подготовку.',
  })
  completedById: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-29T09:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-07-31T10:15:00.000Z',
  })
  updatedAt: string;
}
