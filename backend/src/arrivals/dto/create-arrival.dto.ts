import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCarDto } from '../../cars/dto/create-car.dto';

export class CreateArrivalDto {
  @ApiProperty({ example: 'А001АА77', description: 'Госномер автовоза' })
  @IsString()
  @MaxLength(30)
  truckNumber: string;

  @ApiProperty({ example: '2026-07-23T10:00:00.000Z', description: 'Дата и время поступления (ISO 8601)' })
  @IsDateString()
  arrivalDate: string;

  @ApiPropertyOptional({ example: 'Автовоз задержался на 2 часа', description: 'Комментарий к поступлению' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;

  @ApiProperty({ type: [CreateCarDto], description: 'Список автомобилей в поступлении (минимум 1)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCarDto)
  cars: CreateCarDto[];
}
