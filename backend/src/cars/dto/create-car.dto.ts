import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCarDto {
  @ApiProperty({ example: 'XW8ED41P21K123456', description: 'VIN-номер автомобиля (6-17 символов)' })
  @IsString()
  @MinLength(6)
  @MaxLength(17)
  vin: string;

  @ApiProperty({ example: 1, description: 'ID площадки' })
  @IsInt()
  siteId: number;

  @ApiProperty({ example: 1, description: 'ID модели' })
  @IsInt()
  modelId: number;

  @ApiProperty({ example: 1, description: 'ID бренда' })
  @IsInt()
  brandId: number;

  @ApiProperty({ example: 1, description: 'ID цвета' })
  @IsInt()
  colorId: number;

  @ApiProperty({ example: 'cm7x...', description: 'ID поступления (cuid)' })
  @IsString()
  arrivalId: string;

  @ApiPropertyOptional({ example: 'Царапина на заднем бампере', description: 'Комментарий к автомобилю' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
