import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponseDto {
  @ApiProperty({
    example: 42,
    description:
      'Количество автомобилей со статусом ACTIVE в компании и доступных локациях аутентифицированного пользователя.',
  })
  carsOnStock: number;

  @ApiProperty({
    example: 7,
    description:
      'Количество доступных автомобилей со статусом ACTIVE и связанной записью PSO в статусе PENDING.',
  })
  needPso: number;

  @ApiProperty({
    example: 3,
    description:
      'Количество событий CAR_ISSUED за сегодня в доступных локациях.',
  })
  issuedToday: number;

  @ApiProperty({
    example: 5,
    description:
      'Количество доступных активных автомобилей, у которых текущий Battery-период наступит через 2–3 календарных дня.',
  })
  batteryUpcoming: number;

  @ApiProperty({
    example: 2,
    description:
      'Количество доступных активных автомобилей, у которых текущий Battery-период наступит сегодня или через 1 календарный день.',
  })
  batteryUrgent: number;

  @ApiProperty({
    example: 4,
    description:
      'Количество доступных активных автомобилей с просроченным текущим Battery-периодом.',
  })
  batteryOverdue: number;
}
