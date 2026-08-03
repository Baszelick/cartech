import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';

export class UserListItemResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
    description: 'Идентификатор пользователя.',
  })
  id: string;

  @ApiProperty({
    example: 'operator',
    description: 'Имя пользователя, уникальное в рамках компании.',
  })
  username: string;

  @ApiProperty({ example: 'Анна' })
  firstName: string;

  @ApiProperty({ example: 'Иванова' })
  lastName: string;

  @ApiProperty({
    example: true,
    description: 'Признак активности пользователя.',
  })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description: 'Требуется ли смена временного пароля.',
  })
  mustChangePassword: boolean;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.OPERATIONS_MANAGER],
    description: 'Роли пользователя из UserRoleAssignment.',
  })
  roles: UserRole[];
}
