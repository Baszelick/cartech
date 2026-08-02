import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateUserLocationAccessDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: [
      'cb9b2fec-7878-4dac-a87b-426df4754567',
      '7e536f3f-f330-466f-980f-48464452d930',
    ],
    description:
      'Полный новый набор UUID локаций. Пустой массив удаляет все доступы; дубликаты отклоняются.',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  locationIds: string[];
}
