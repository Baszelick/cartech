import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatteryTaskStatus } from '../../battery/battery-schedule.service';

export enum CarTaskType {
  PSO = 'PSO',
  BATTERY = 'BATTERY',
}

export enum CarTaskStatus {
  PENDING = 'PENDING',
  UPCOMING = BatteryTaskStatus.UPCOMING,
  URGENT = BatteryTaskStatus.URGENT,
  OVERDUE = BatteryTaskStatus.OVERDUE,
}

export class CarTaskResponseDto {
  @ApiProperty({
    example: '8d4cb819-393b-4a72-947b-53f53a67f20b',
    format: 'uuid',
  })
  carId: string;

  @ApiPropertyOptional({
    example: 'WVWZZZ1JZXW000001',
    nullable: true,
  })
  vin: string | null;

  @ApiProperty({ enum: CarTaskType, example: CarTaskType.BATTERY })
  type: CarTaskType;

  @ApiProperty({ enum: CarTaskStatus, example: CarTaskStatus.UPCOMING })
  status: CarTaskStatus;

  @ApiProperty({ example: '2026-08-31', format: 'date' })
  dueOn: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Номер календарного периода. Заполняется только для Battery.',
  })
  periodNumber?: number;
}
