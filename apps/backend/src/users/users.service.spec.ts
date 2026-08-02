import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(UsersService);
  });

  it('lists only users in the JWT company with stable sorting', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-id',
        username: 'operator',
        firstName: 'Анна',
        lastName: 'Иванова',
        isActive: true,
        roles: [{ role: UserRole.OPERATIONS_MANAGER }],
      },
    ]);

    const result = await service.findAll('company-id');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-id' },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
          { username: 'asc' },
          { id: 'asc' },
        ],
      }),
    );
    expect(result).toEqual([
      {
        id: 'user-id',
        username: 'operator',
        firstName: 'Анна',
        lastName: 'Иванова',
        isActive: true,
        roles: [UserRole.OPERATIONS_MANAGER],
      },
    ]);
  });

  it('maps every UserRoleAssignment to the roles array', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-id',
        username: 'owner',
        firstName: 'Иван',
        lastName: 'Петров',
        isActive: true,
        roles: [
          { role: UserRole.SYSTEM_OWNER },
          { role: UserRole.OPERATIONS_MANAGER },
        ],
      },
    ]);

    const [user] = await service.findAll('company-id');

    expect(user.roles).toEqual([
      UserRole.SYSTEM_OWNER,
      UserRole.OPERATIONS_MANAGER,
    ]);
  });

  it('returns a user only within the JWT company', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-id',
      username: 'operator',
      firstName: 'Анна',
      lastName: 'Иванова',
      isActive: true,
      roles: [{ role: UserRole.OPERATIONS_MANAGER }],
    });

    const result = await service.findById('user-id', 'company-id');

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-id', companyId: 'company-id' },
      }),
    );
    expect(result.id).toBe('user-id');
  });

  it('hides a user from another company through NotFound', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.findById('foreign-user-id', 'company-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns NotFound when the user does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.findById('missing-user-id', 'company-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
