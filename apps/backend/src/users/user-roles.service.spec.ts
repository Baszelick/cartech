import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UserRolesService } from './user-roles.service';

describe('UserRolesService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    userRoleAssignment: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    authSession: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const owner = {
    userId: 'owner-id',
    companyId: 'company-id',
    username: 'owner',
    roles: [UserRole.SYSTEM_OWNER],
  } as AuthenticatedUser;
  const manager = {
    userId: 'manager-id',
    companyId: 'company-id',
    username: 'manager',
    roles: [UserRole.OPERATIONS_MANAGER],
  } as AuthenticatedUser;
  let service: UserRolesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    const module = await Test.createTestingModule({
      providers: [
        UserRolesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UserRolesService);
  });

  it('returns stable roles for a user in the current company', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'target-id',
      roles: [
        { role: UserRole.SYSTEM_OWNER },
        { role: UserRole.VIEWER },
      ],
    });

    await expect(
      service.getForUser('target-id', 'company-id'),
    ).resolves.toEqual({
      userId: 'target-id',
      roles: [UserRole.SYSTEM_OWNER, UserRole.VIEWER],
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'target-id', companyId: 'company-id' },
      select: {
        id: true,
        roles: {
          orderBy: { role: 'asc' },
          select: { role: true },
        },
      },
    });
  });

  it('hides a foreign user through NotFound', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.getForUser('foreign-id', 'company-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fully replaces roles and deletes sessions in one transaction', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'target-id',
      roles: [{ role: UserRole.VIEWER }],
    });

    await expect(
      service.replaceForUser(
        'target-id',
        { roles: [UserRole.VIEWER, UserRole.TECHNICIAN] },
        owner,
      ),
    ).resolves.toEqual({
      userId: 'target-id',
      roles: [UserRole.TECHNICIAN, UserRole.VIEWER],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.userRoleAssignment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-id' },
    });
    expect(prisma.userRoleAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'target-id', role: UserRole.VIEWER },
        { userId: 'target-id', role: UserRole.TECHNICIAN },
      ],
    });
    expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target-id' },
    });
  });

  it('rejects an empty role set before the transaction', async () => {
    await expect(
      service.replaceForUser('target-id', { roles: [] }, owner),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate roles before the transaction', async () => {
    await expect(
      service.replaceForUser(
        'target-id',
        { roles: [UserRole.VIEWER, UserRole.VIEWER] },
        owner,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('forbids manager self-update', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'manager-id',
      roles: [{ role: UserRole.OPERATIONS_MANAGER }],
    });

    await expect(
      service.replaceForUser(
        'manager-id',
        { roles: [UserRole.VIEWER] },
        manager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids manager from assigning SYSTEM_OWNER', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'target-id',
      roles: [{ role: UserRole.VIEWER }],
    });

    await expect(
      service.replaceForUser(
        'target-id',
        { roles: [UserRole.SYSTEM_OWNER] },
        manager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids manager from removing SYSTEM_OWNER', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'target-id',
      roles: [{ role: UserRole.SYSTEM_OWNER }],
    });

    await expect(
      service.replaceForUser(
        'target-id',
        { roles: [UserRole.VIEWER] },
        manager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows owner to replace own roles when another owner remains', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'owner-id',
      roles: [{ role: UserRole.SYSTEM_OWNER }],
    });
    prisma.userRoleAssignment.count.mockResolvedValue(1);

    await expect(
      service.replaceForUser(
        'owner-id',
        { roles: [UserRole.VIEWER] },
        owner,
      ),
    ).resolves.toEqual({
      userId: 'owner-id',
      roles: [UserRole.VIEWER],
    });
  });

  it('rejects removal of the last SYSTEM_OWNER', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'owner-id',
      roles: [{ role: UserRole.SYSTEM_OWNER }],
    });
    prisma.userRoleAssignment.count.mockResolvedValue(0);

    await expect(
      service.replaceForUser(
        'owner-id',
        { roles: [UserRole.VIEWER] },
        owner,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userRoleAssignment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.authSession.deleteMany).not.toHaveBeenCalled();
  });

  it('does not modify location access while replacing roles', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'target-id',
      roles: [{ role: UserRole.VIEWER }],
    });

    await service.replaceForUser(
      'target-id',
      { roles: [UserRole.TECHNICIAN] },
      owner,
    );

    expect(prisma).not.toHaveProperty('userLocationAccess.deleteMany');
  });
});
