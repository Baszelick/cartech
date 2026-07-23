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
import { CreateCarDto } from '../../cars/dto/create-car.dto';

export class CreateArrivalDto {
  @IsString()
  @MaxLength(30)
  truckNumber: string;

  @IsDateString()
  arrivalDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCarDto)
  cars: CreateCarDto[];
}
