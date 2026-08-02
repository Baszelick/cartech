import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateSiteDto {
  @ApiPropertyOptional({
    example: 'Площадка хранения',
    description: 'Новое уникальное в рамках локации название площадки.',
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
