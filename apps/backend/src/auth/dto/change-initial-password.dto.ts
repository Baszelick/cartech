import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from '../password-policy';

export class ChangeInitialPasswordDto {
  @ApiProperty({
    example: 'Tech2026',
    description: PASSWORD_REQUIREMENTS,
    writeOnly: true,
  })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS })
  newPassword: string;
}
