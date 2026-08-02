import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../../../generated/prisma/enums';
import { UpdateUserRolesDto } from './update-user-roles.dto';

describe('UpdateUserRolesDto', () => {
  it('accepts a non-empty unique role set', async () => {
    const dto = plainToInstance(UpdateUserRolesDto, {
      roles: [UserRole.TECHNICIAN, UserRole.VIEWER],
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects an empty role set', async () => {
    const errors = await validate(
      plainToInstance(UpdateUserRolesDto, { roles: [] }),
    );

    expect(errors).not.toHaveLength(0);
  });

  it('rejects duplicate roles', async () => {
    const errors = await validate(
      plainToInstance(UpdateUserRolesDto, {
        roles: [UserRole.TECHNICIAN, UserRole.TECHNICIAN],
      }),
    );

    expect(errors).not.toHaveLength(0);
  });

  it('rejects an unknown role', async () => {
    const errors = await validate(
      plainToInstance(UpdateUserRolesDto, { roles: ['ADMIN'] }),
    );

    expect(errors).not.toHaveLength(0);
  });
});
