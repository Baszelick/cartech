import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBatteryCheckDto {
  @ApiPropertyOptional({
    example: 12.6,
    minimum: 0,
    maximum: 30,
    description: 'Measured battery voltage.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  voltage?: number;

  @ApiPropertyOptional({
    example: 'Voltage is normal',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
