import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'FORSAGE',
    minLength: 2,
    maxLength: 32,
    pattern: '^[A-Z0-9_-]{2,32}$',
    description: 'Публичный код компании. Пробелы удаляются, буквы приводятся к верхнему регистру.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(2, 32)
  @Matches(/^[A-Z0-9_-]{2,32}$/)
  companyCode: string;

  @ApiProperty({
    example: 'ivan',
    description: 'Имя пользователя, уникальное в рамках компании.',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: '178Region',
    format: 'password',
    writeOnly: true,
    description: 'Пароль пользователя.',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
