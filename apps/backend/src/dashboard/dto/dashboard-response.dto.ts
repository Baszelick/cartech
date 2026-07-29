import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponseDto {
  @ApiProperty({
    example: 42,
    description:
      'Number of ACTIVE cars in the authenticated user company and accessible locations.',
  })
  carsOnStock: number;

  @ApiProperty({
    example: 7,
    description:
      'Number of accessible ACTIVE cars with a PENDING PSO relation.',
  })
  needPso: number;

  @ApiProperty({
    example: 3,
    description: 'Number of CAR_ISSUED events today in accessible locations.',
  })
  issuedToday: number;
}
