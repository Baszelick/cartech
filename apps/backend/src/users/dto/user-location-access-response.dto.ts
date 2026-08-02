import { ApiProperty } from '@nestjs/swagger';

export class UserLocationAccessItemDto {
  @ApiProperty({
    format: 'uuid',
    example: 'cb9b2fec-7878-4dac-a87b-426df4754567',
    description: 'Идентификатор назначенной локации.',
  })
  id: string;

  @ApiProperty({
    example: 'MSK',
    description: 'Код локации.',
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

export class UserLocationAccessResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  userId: string;

  @ApiProperty({
    type: [UserLocationAccessItemDto],
    description: 'Назначенные локации, стабильно отсортированные по названию.',
  })
  locations: UserLocationAccessItemDto[];
}
