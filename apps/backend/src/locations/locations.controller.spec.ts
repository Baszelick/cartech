import { Test } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

describe('LocationsController', () => {
  const locationsService = {
    findAll: jest.fn(),
    findSites: jest.fn(),
    create: jest.fn(),
    updateLocation: jest.fn(),
    deactivateLocation: jest.fn(),
    createSite: jest.fn(),
    updateSite: jest.fn(),
    deactivateSite: jest.fn(),
  };
  const request = {
    user: {
      userId: 'user-id',
      companyId: 'company-id',
      username: 'operator',
      roles: ['VIEWER'],
    },
  } as AuthenticatedRequest;
  let controller: LocationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [{ provide: LocationsService, useValue: locationsService }],
    }).compile();
    controller = module.get(LocationsController);
  });

  it('protects create with JWT then role guard and administrative roles', () => {
    const classGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      LocationsController,
    ) as unknown[];
    const methodGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      LocationsController.prototype.create,
    ) as unknown[];
    const roles = new Reflector().get<UserRole[]>(
      ROLES_KEY,
      LocationsController.prototype.create,
    );

    expect(classGuards).toEqual([JwtAuthGuard]);
    expect(methodGuards).toEqual([RolesGuard]);
    expect(roles).toEqual([UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER]);
  });

  it.each([
    'create',
    'updateLocation',
    'deactivateLocation',
    'createSite',
    'updateSite',
    'deactivateSite',
  ] as const)('protects %s with administrative role metadata', (method) => {
    const methodGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      LocationsController.prototype[method],
    ) as unknown[];
    const roles = new Reflector().get<UserRole[]>(
      ROLES_KEY,
      LocationsController.prototype[method],
    );

    expect(methodGuards).toEqual([RolesGuard]);
    expect(roles).toEqual([UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER]);
  });

  it('passes DTO and JWT company to location creation', async () => {
    const dto = { code: 'MSK', name: 'Москва' };
    locationsService.create.mockResolvedValue({ id: 'location-id' });

    await controller.create(dto, request);

    expect(locationsService.create).toHaveBeenCalledWith(dto, 'company-id');
  });

  it('passes UUID, DTO and JWT company to location update', async () => {
    const dto = { name: 'Новое имя' };
    await controller.updateLocation('location-id', dto, request);

    expect(locationsService.updateLocation).toHaveBeenCalledWith(
      'location-id',
      dto,
      'company-id',
    );
  });

  it('passes UUID and JWT company to location deactivation', async () => {
    await controller.deactivateLocation('location-id', request);

    expect(locationsService.deactivateLocation).toHaveBeenCalledWith(
      'location-id',
      'company-id',
    );
  });

  it('passes location UUID, DTO and JWT company to site creation', async () => {
    const dto = { name: 'Площадка' };
    await controller.createSite('location-id', dto, request);

    expect(locationsService.createSite).toHaveBeenCalledWith(
      'location-id',
      dto,
      'company-id',
    );
  });

  it('passes UUIDs, DTO and JWT company to site update', async () => {
    const dto = { name: 'Новое имя' };
    await controller.updateSite('location-id', 'site-id', dto, request);

    expect(locationsService.updateSite).toHaveBeenCalledWith(
      'location-id',
      'site-id',
      dto,
      'company-id',
    );
  });

  it('passes UUIDs and JWT company to site deactivation', async () => {
    await controller.deactivateSite('location-id', 'site-id', request);

    expect(locationsService.deactivateSite).toHaveBeenCalledWith(
      'location-id',
      'site-id',
      'company-id',
    );
  });

  it('passes authenticated user scope to the location service', async () => {
    locationsService.findAll.mockResolvedValue([]);

    await expect(controller.findAll(request)).resolves.toEqual([]);
    expect(locationsService.findAll).toHaveBeenCalledWith({
      userId: 'user-id',
      companyId: 'company-id',
    });
  });

  it('passes UUID and authenticated user scope to the site service', async () => {
    locationsService.findSites.mockResolvedValue([]);

    await expect(controller.findSites('location-id', request)).resolves.toEqual(
      [],
    );
    expect(locationsService.findSites).toHaveBeenCalledWith('location-id', {
      userId: 'user-id',
      companyId: 'company-id',
    });
  });
});
