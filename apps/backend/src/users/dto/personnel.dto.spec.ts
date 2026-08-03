import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import { ChangeInitialPasswordDto } from '../../auth/dto/change-initial-password.dto';
import { CreateUserDto } from './create-user.dto';
import { ResetUserPasswordDto } from './reset-user-password.dto';
import { UpdateUserDto } from './update-user.dto';

describe('personnel password and collection DTO validation', () => {
  const validCreate = {
    username: ' technician ',
    firstName: ' Иван ',
    lastName: ' Петров ',
    temporaryPassword: 'Tech2026',
    roles: [UserRole.TECHNICIAN],
    locationIds: ['11111111-1111-4111-8111-111111111111'],
  };

  it('trims personnel identity fields', async () => {
    const dto = plainToInstance(CreateUserDto, validCreate);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.username).toBe('technician');
    expect(dto.firstName).toBe('Иван');
    expect(dto.lastName).toBe('Петров');
  });

  it.each([
    { roles: [] },
    { roles: [UserRole.TECHNICIAN, UserRole.TECHNICIAN] },
    { locationIds: [] },
    {
      locationIds: [
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
      ],
    },
  ])('rejects invalid role/location collection %j', async (override) => {
    const dto = plainToInstance(CreateUserDto, {
      ...validCreate,
      ...override,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it.each([
    'short1!',
    'тест2026',
    'LettersOnly',
    '123456',
    'A1 bbb',
  ])('rejects invalid password %s in every password DTO', async (password) => {
    const create = plainToInstance(CreateUserDto, {
      ...validCreate,
      temporaryPassword: password,
    });
    const reset = plainToInstance(ResetUserPasswordDto, {
      temporaryPassword: password,
    });
    const change = plainToInstance(ChangeInitialPasswordDto, {
      newPassword: password,
    });

    expect(await validate(create)).not.toHaveLength(0);
    expect(await validate(reset)).not.toHaveLength(0);
    expect(await validate(change)).not.toHaveLength(0);
  });

  it('normalizes username and validates personnel names', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      username: ' Ivan.Petrov ',
      firstName: ' Иван-Пётр ',
      lastName: ' Smith ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.username).toBe('ivan.petrov');
    expect(dto.firstName).toBe('Иван-Пётр');
    expect(dto.lastName).toBe('Smith');
  });

  it.each(['ab', 'invalid name!', 'a'.repeat(33)])(
    'rejects invalid username %s',
    async (username) => {
      const dto = plainToInstance(UpdateUserDto, { username });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );
});
