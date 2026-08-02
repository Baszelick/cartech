import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';

export class UpdateUserRolesDto {
  @ApiProperty({
    enum: UserRole,
    isArray: true,
    minItems: 1,
    example: [UserRole.OPERATIONS_MANAGER, UserRole.VIEWER],
    description:
      'Полный новый набор ролей. Пустой массив и повторяющиеся роли отклоняются.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
