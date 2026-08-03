import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('trims and uppercases companyCode', async () => {
    const dto = plainToInstance(LoginDto, {
      companyCode: '  forsage ',
      username: 'ivan',
      password: '178Region',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.companyCode).toBe('FORSAGE');
  });

  it('rejects the legacy companyId contract', async () => {
    const dto = plainToInstance(LoginDto, {
      companyId: '80ad46f0-d89f-46ce-a92a-e11c4dfc2714',
      username: 'ivan',
      password: '178Region',
    });

    const errors = await validate(dto);

    expect(errors.some(({ property }) => property === 'companyCode')).toBe(
      true,
    );
  });

  it.each(['A', 'FOR SAGE', 'FOR$AGE', 'A'.repeat(33)])(
    'rejects invalid company code %s',
    async (companyCode) => {
      const dto = plainToInstance(LoginDto, {
        companyCode,
        username: 'ivan',
        password: '178Region',
      });

      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
});
