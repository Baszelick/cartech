import { ApiProperty } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '80ad46f0-d89f-46ce-a92a-e11c4dfc2714',
  })
  id: string;

  @ApiProperty({ example: 'FORSAGE' })
  code: string;

  @ApiProperty({ example: 'Форсаж' })
  name: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}
