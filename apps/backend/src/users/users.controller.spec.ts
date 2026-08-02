import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserLocationAccessService } from './user-location-access.service';
import { UserRolesService } from './user-roles.service';

describe('UsersController', () => {
  const usersService = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };
  const userLocationAccessService = {
    getForUser: jest.fn(),
    replaceForUser: jest.fn(),
  };
  const userRolesService = {
    getForUser: jest.fn(),
    replaceForUser: jest.fn(),
  };
  const request = {
    user: {
      userId: 'manager-id',
      companyId: 'company-id',
      username: 'manager',
      roles: [UserRole.OPERATIONS_MANAGER],
    },
  } as AuthenticatedRequest;
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        {
          provide: UserLocationAccessService,
          useValue: userLocationAccessService,
        },
        { provide: UserRolesService, useValue: userRolesService },
      ],
    }).compile();
    controller = module.get(UsersController);
  });

  it('declares JWT then role guards and permitted role metadata', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UsersController,
    ) as unknown[];
    const roles = new Reflector().get<UserRole[]>(ROLES_KEY, UsersController);

    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
    expect(roles).toEqual([UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER]);
  });

  it('passes authenticated company context to the list service', async () => {
    usersService.findAll.mockResolvedValue([]);

    await expect(controller.findAll(request)).resolves.toEqual([]);
    expect(usersService.findAll).toHaveBeenCalledWith('company-id');
  });

  it('passes UUID and authenticated company context to details service', async () => {
    usersService.findById.mockResolvedValue({ id: 'user-id' });

    await expect(controller.findById('user-id', request)).resolves.toEqual({
      id: 'user-id',
    });
    expect(usersService.findById).toHaveBeenCalledWith('user-id', 'company-id');
  });

  it('passes UUID and JWT company context to location access read', async () => {
    userLocationAccessService.getForUser.mockResolvedValue({
      userId: 'user-id',
      locations: [],
    });

    await controller.getLocationAccess('user-id', request);

    expect(userLocationAccessService.getForUser).toHaveBeenCalledWith(
      'user-id',
      'company-id',
    );
  });

  it('passes UUID, DTO and full JWT context to location access replace', async () => {
    const dto = { locationIds: ['location-id'] };
    userLocationAccessService.replaceForUser.mockResolvedValue({
      userId: 'user-id',
      locations: [],
    });

    await controller.replaceLocationAccess('user-id', dto, request);

    expect(userLocationAccessService.replaceForUser).toHaveBeenCalledWith(
      'user-id',
      dto,
      request.user,
    );
  });

  it('passes UUID and JWT company context to roles read', async () => {
    userRolesService.getForUser.mockResolvedValue({
      userId: 'user-id',
      roles: [],
    });

    await controller.getRoles('user-id', request);

    expect(userRolesService.getForUser).toHaveBeenCalledWith(
      'user-id',
      'company-id',
    );
  });

  it('passes UUID, DTO and full JWT context to role replacement', async () => {
    const dto = { roles: [UserRole.VIEWER] };
    userRolesService.replaceForUser.mockResolvedValue({
      userId: 'user-id',
      roles: [UserRole.VIEWER],
    });

    await controller.replaceRoles('user-id', dto, request);

    expect(userRolesService.replaceForUser).toHaveBeenCalledWith(
      'user-id',
      dto,
      request.user,
    );
  });
});
