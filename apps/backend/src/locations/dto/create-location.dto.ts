import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateLocationDto {
  @ApiProperty({
    example: 'MSK',
    description: 'Уникальный в рамках компании код локации.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Москва',
    description: 'Название локации.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  name: string;
}
