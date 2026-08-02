import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';

export class UserRolesResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
  })
  userId: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.OPERATIONS_MANAGER, UserRole.VIEWER],
    description: 'Стабильно отсортированный набор ролей пользователя.',
  })
  roles: UserRole[];
}
