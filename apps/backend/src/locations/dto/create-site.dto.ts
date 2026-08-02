import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateSiteDto {
  @ApiProperty({
    example: 'Основная площадка',
    description: 'Уникальное в рамках локации название площадки.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  name: string;
}
