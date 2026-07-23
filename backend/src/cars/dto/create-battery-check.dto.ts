import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBatteryCheckDto {
  @ApiPropertyOptional({ example: 12.6, description: 'Напряжение аккумулятора (В)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  voltage?: number;

  @ApiPropertyOptional({ example: 'Норма', description: 'Комментарий к проверке' })
  @IsOptional()
  @IsString()
  comment?: string;
}
