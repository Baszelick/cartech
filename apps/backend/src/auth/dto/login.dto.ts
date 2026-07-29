import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: '80ad46f0-d89f-46ce-a92a-e11c4dfc2714',
    format: 'uuid',
    description: 'Company identifier.',
  })
  @IsUUID()
  companyId: string;

  @ApiProperty({
    example: 'operator',
    description: 'Username unique within the company.',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'change-me',
    format: 'password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
