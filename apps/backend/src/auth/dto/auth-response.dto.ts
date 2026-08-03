import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums';

export class AuthUserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'f8b3371a-3f88-4de6-aa43-c72811d07be2',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '80ad46f0-d89f-46ce-a92a-e11c4dfc2714',
  })
  companyId: string;

  @ApiProperty({ example: 'operator' })
  username: string;

  @ApiProperty({ example: 'Anna' })
  firstName: string;

  @ApiProperty({ example: 'Ivanova' })
  lastName: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.TECHNICIAN],
    description: 'Роли, назначенные через UserRoleAssignment.',
  })
  roles: UserRole[];

  @ApiProperty({
    example: false,
    description: 'Требуется ли обязательная смена временного пароля.',
  })
  mustChangePassword: boolean;
}

export class AuthSessionResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access-токен.',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}
