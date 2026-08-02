import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLocationDto } from './create-location.dto';

describe('CreateLocationDto', () => {
  it('trims allowed string fields', async () => {
    const dto = plainToInstance(CreateLocationDto, {
      code: '  MSK  ',
      name: '  Москва  ',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto).toMatchObject({ code: 'MSK', name: 'Москва' });
  });

  it.each([
    { code: '   ', name: 'Москва' },
    { code: 'MSK', name: '   ' },
  ])('rejects empty normalized strings', async (input) => {
    const errors = await validate(plainToInstance(CreateLocationDto, input));

    expect(errors).not.toHaveLength(0);
  });
});
