import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCarDto {
  @IsString()
  @MinLength(6)
  @MaxLength(17)
  vin: string;

  @IsInt()
  siteId: number;

  @IsInt()
  modelId: number;

  @IsInt()
  brandId: number;

  @IsInt()
  colorId: number;

  @IsString()
  arrivalId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
