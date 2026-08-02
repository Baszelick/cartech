import { ApiProperty } from '@nestjs/swagger';

export class HttpErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Некорректный запрос' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['companyId должен быть UUID'],
      },
    ],
  })
  message: string | string[];

  @ApiProperty({ example: 'Некорректный запрос' })
  error: string;
}
