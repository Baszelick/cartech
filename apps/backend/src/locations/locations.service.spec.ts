import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  const prisma = {
    location: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    site: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    car: { count: jest.fn() },
    $transaction: jest.fn(),
  };
  const scope = { userId: 'user-id', companyId: 'company-id' };
  let service: LocationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LocationsService);
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof prisma) => unknown) => callback(prisma),
    );
  });

  it('creates a location in the company from the JWT scope', async () => {
    prisma.location.create.mockResolvedValue({
      id: 'location-id',
      code: 'MSK',
      name: 'Москва',
      isActive: true,
    });

    await expect(
      service.create({ code: 'MSK', name: 'Москва' }, 'company-id'),
    ).resolves.toEqual({
      id: 'location-id',
      code: 'MSK',
      name: 'Москва',
      isActive: true,
    });
    expect(prisma.location.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-id',
        code: 'MSK',
        name: 'Москва',
      },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });
  });

  it('does not accept company or server fields from the request DTO', async () => {
    prisma.location.create.mockResolvedValue({
      id: 'location-id',
      code: 'MSK',
      name: 'Москва',
      isActive: true,
    });
    const unsafeDto = {
      code: 'MSK',
      name: 'Москва',
      companyId: 'other-company-id',
      isActive: false,
    };

    await service.create(unsafeDto, 'company-id');

    expect(prisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          companyId: 'company-id',
          code: 'MSK',
          name: 'Москва',
        },
      }),
    );
  });

  it('maps a duplicate company location code to Conflict', async () => {
    prisma.location.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({ code: 'MSK', name: 'Москва' }, 'company-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates an active or inactive location in its company', async () => {
    prisma.location.findFirst.mockResolvedValue({
      id: 'location-id',
      isActive: false,
    });
    prisma.location.update.mockResolvedValue({
      id: 'location-id',
      code: 'MSK-WEST',
      name: 'Москва, запад',
      isActive: false,
    });

    await service.updateLocation(
      'location-id',
      { code: 'MSK-WEST', name: 'Москва, запад' },
      'company-id',
    );

    expect(prisma.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'location-id', companyId: 'company-id' },
      select: { id: true },
    });
    expect(prisma.location.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'location-id' },
        data: { code: 'MSK-WEST', name: 'Москва, запад' },
      }),
    );
  });

  it('hides a foreign location during update', async () => {
    prisma.location.findFirst.mockResolvedValue(null);

    await expect(
      service.updateLocation(
        'location-id',
        { name: 'Новое имя' },
        'company-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.location.update).not.toHaveBeenCalled();
  });

  it('deactivates an empty location transactionally', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'location-id' });
    prisma.car.count.mockResolvedValue(0);
    prisma.location.update.mockResolvedValue({
      id: 'location-id',
      code: 'MSK',
      name: 'Москва',
      isActive: false,
    });

    await expect(
      service.deactivateLocation('location-id', 'company-id'),
    ).resolves.toMatchObject({ isActive: false });
    expect(prisma.car.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company-id',
        currentSite: { locationId: 'location-id' },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects location deactivation while cars are inside', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'location-id' });
    prisma.car.count.mockResolvedValue(2);

    await expect(
      service.deactivateLocation('location-id', 'company-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.location.update).not.toHaveBeenCalled();
  });

  it('creates a site inside an inactive company location', async () => {
    prisma.location.findFirst.mockResolvedValue({
      id: 'location-id',
      isActive: false,
    });
    prisma.site.create.mockResolvedValue({
      id: 'site-id',
      locationId: 'location-id',
      name: 'Резервная площадка',
      isActive: true,
    });

    await service.createSite(
      'location-id',
      { name: 'Резервная площадка' },
      'company-id',
    );

    expect(prisma.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'location-id', companyId: 'company-id' },
      select: { id: true },
    });
    expect(prisma.site.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          locationId: 'location-id',
          name: 'Резервная площадка',
        },
      }),
    );
  });

  it('hides a foreign location during site creation', async () => {
    prisma.location.findFirst.mockResolvedValue(null);

    await expect(
      service.createSite('location-id', { name: 'Site' }, 'company-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.site.create).not.toHaveBeenCalled();
  });

  it('updates an active or inactive site in its company location', async () => {
    prisma.site.findFirst.mockResolvedValue({
      id: 'site-id',
      isActive: false,
    });
    prisma.site.update.mockResolvedValue({
      id: 'site-id',
      locationId: 'location-id',
      name: 'Новое имя',
      isActive: false,
    });

    await service.updateSite(
      'location-id',
      'site-id',
      { name: 'Новое имя' },
      'company-id',
    );

    expect(prisma.site.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'site-id',
        locationId: 'location-id',
        location: { companyId: 'company-id' },
      },
      select: { id: true },
    });
    expect(prisma.site.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'site-id' },
        data: { name: 'Новое имя' },
      }),
    );
  });

  it('hides a site from another location or company', async () => {
    prisma.site.findFirst.mockResolvedValue(null);

    await expect(
      service.updateSite(
        'location-id',
        'site-id',
        { name: 'Новое имя' },
        'company-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.site.update).not.toHaveBeenCalled();
  });

  it('deactivates an empty site transactionally', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site-id' });
    prisma.car.count.mockResolvedValue(0);
    prisma.site.update.mockResolvedValue({
      id: 'site-id',
      locationId: 'location-id',
      name: 'Площадка',
      isActive: false,
    });

    await expect(
      service.deactivateSite('location-id', 'site-id', 'company-id'),
    ).resolves.toMatchObject({ isActive: false });
    expect(prisma.car.count).toHaveBeenCalledWith({
      where: { companyId: 'company-id', currentSiteId: 'site-id' },
    });
  });

  it('rejects site deactivation while cars are on it', async () => {
    prisma.site.findFirst.mockResolvedValue({ id: 'site-id' });
    prisma.car.count.mockResolvedValue(1);

    await expect(
      service.deactivateSite('location-id', 'site-id', 'company-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.site.update).not.toHaveBeenCalled();
  });

  it('returns only locations assigned to the user in the current company', async () => {
    prisma.location.findMany.mockResolvedValue([
      {
        id: 'location-id',
        code: 'MSK',
        name: 'Москва',
        isActive: true,
      },
    ]);

    const result = await service.findAll(scope);

    expect(prisma.location.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-id',
        userAccesses: { some: { userId: 'user-id' } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });
    expect(result).toEqual([
      {
        id: 'location-id',
        code: 'MSK',
        name: 'Москва',
        isActive: true,
      },
    ]);
  });

  it('isolates locations by company from the JWT scope', async () => {
    prisma.location.findMany.mockResolvedValue([]);

    await service.findAll({
      userId: 'same-user-id',
      companyId: 'other-company-id',
    });

    expect(prisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'other-company-id',
          userAccesses: { some: { userId: 'same-user-id' } },
        },
      }),
    );
  });

  it('returns an empty list when the user has no location access', async () => {
    prisma.location.findMany.mockResolvedValue([]);

    await expect(service.findAll(scope)).resolves.toEqual([]);
  });

  it('returns sites for an accessible location', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'location-id' });
    prisma.site.findMany.mockResolvedValue([
      {
        id: 'site-id',
        locationId: 'location-id',
        name: 'Основная площадка',
        isActive: true,
      },
    ]);

    const result = await service.findSites('location-id', scope);

    expect(prisma.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'location-id',
        companyId: 'company-id',
        userAccesses: { some: { userId: 'user-id' } },
      },
      select: { id: true },
    });
    expect(prisma.site.findMany).toHaveBeenCalledWith({
      where: { locationId: 'location-id' },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        locationId: true,
        name: true,
        isActive: true,
      },
    });
    expect(result).toHaveLength(1);
  });

  it('returns NotFound for a missing or inaccessible location', async () => {
    prisma.location.findFirst.mockResolvedValue(null);

    await expect(
      service.findSites('location-id', scope),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.site.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty site list for an accessible location', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'location-id' });
    prisma.site.findMany.mockResolvedValue([]);

    await expect(service.findSites('location-id', scope)).resolves.toEqual([]);
  });
});
