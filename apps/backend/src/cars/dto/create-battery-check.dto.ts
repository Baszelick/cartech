import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBatteryCheckDto {
  @ApiPropertyOptional({
    example: 12.6,
    minimum: 0,
    maximum: 30,
    description: 'Измеренное напряжение аккумулятора.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  voltage?: number;

  @ApiPropertyOptional({
    example: 'Напряжение в норме',
    description: 'Комментарий к проверке.',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
