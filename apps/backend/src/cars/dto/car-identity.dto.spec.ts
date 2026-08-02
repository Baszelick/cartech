import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArrivalCarDto } from '../../arrivals/dto/create-arrival.dto';
import { UpdateCarIdentityDto } from './update-car-identity.dto';

describe('Car identity DTO validation', () => {
  const arrivalBase = {
    shortVin: 'ABC123',
    brand: 'Toyota',
    model: 'Camry',
  };

  it.each(['ABC12', 'ABC1234', 'АБВ123', 'ABC-12', ''])(
    'rejects invalid shortVin %p',
    async (shortVin) => {
      const dto = plainToInstance(ArrivalCarDto, {
        ...arrivalBase,
        shortVin,
      });

      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('normalizes shortVin and full VIN', async () => {
    const dto = plainToInstance(ArrivalCarDto, {
      ...arrivalBase,
      shortVin: ' abc123 ',
      vin: ' xw8ed41p21k123456 ',
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.shortVin).toBe('ABC123');
    expect(dto.vin).toBe('XW8ED41P21K123456');
  });

  it.each(['ABCIOQ', 'ABC-123', 'ABCDE', 'ABCDEFGHIJKLMNOPQR'])(
    'rejects invalid full VIN %p',
    async (vin) => {
      const dto = plainToInstance(ArrivalCarDto, {
        ...arrivalBase,
        vin,
      });

      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it.each([undefined, null])('accepts nullable VIN %p', async (vin) => {
    const dto = plainToInstance(ArrivalCarDto, {
      ...arrivalBase,
      vin,
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it('does not allow clearing shortVin during update', async () => {
    const dto = plainToInstance(UpdateCarIdentityDto, { shortVin: null });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('allows clearing full VIN during update', async () => {
    const dto = plainToInstance(UpdateCarIdentityDto, { vin: null });

    expect(await validate(dto)).toHaveLength(0);
  });
});
