import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateSiteDto } from './create-site.dto';
import { UpdateLocationDto } from './update-location.dto';
import { UpdateSiteDto } from './update-site.dto';

describe('Location and Site write DTO', () => {
  it('trims partial location updates', async () => {
    const dto = plainToInstance(UpdateLocationDto, {
      code: '  MSK-WEST  ',
      name: '  Москва, запад  ',
      companyId: 'ignored-by-whitelist',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto).toMatchObject({
      code: 'MSK-WEST',
      name: 'Москва, запад',
    });
  });

  it('trims a site name on creation', async () => {
    const dto = plainToInstance(CreateSiteDto, { name: '  Площадка  ' });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.name).toBe('Площадка');
  });

  it.each([CreateSiteDto, UpdateSiteDto])(
    'rejects an empty normalized site name for %p',
    async (Dto) => {
      const errors = await validate(
        plainToInstance(Dto, { name: '   ', locationId: 'forbidden' }),
      );

      expect(errors).not.toHaveLength(0);
    },
  );
});
