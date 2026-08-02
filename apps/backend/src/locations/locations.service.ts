import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { SiteResponseDto } from './dto/site-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

export type LocationAuthScope = {
  userId: string;
  companyId: string;
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateLocationDto,
    companyId: string,
  ): Promise<LocationResponseDto> {
    try {
      return await this.prisma.location.create({
        data: {
          companyId,
          code: dto.code,
          name: dto.name,
        },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Location code already exists in this company',
        );
      }

      throw error;
    }
  }

  async updateLocation(
    locationId: string,
    dto: UpdateLocationDto,
    companyId: string,
  ): Promise<LocationResponseDto> {
    await this.requireCompanyLocation(locationId, companyId);

    try {
      return await this.prisma.location.update({
        where: { id: locationId },
        data: {
          code: dto.code,
          name: dto.name,
        },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Location code already exists in this company',
        );
      }

      throw error;
    }
  }

  async deactivateLocation(
    locationId: string,
    companyId: string,
  ): Promise<LocationResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const location = await tx.location.findFirst({
          where: { id: locationId, companyId },
          select: { id: true },
        });

        if (!location) throw new NotFoundException('Location not found');

        const carsAtLocation = await tx.car.count({
          where: {
            companyId,
            currentSite: { locationId },
          },
        });
        if (carsAtLocation > 0) {
          throw new ConflictException(
            'Location cannot be deactivated while cars are located inside it',
          );
        }

        return tx.location.update({
          where: { id: locationId },
          data: { isActive: false },
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async createSite(
    locationId: string,
    dto: CreateSiteDto,
    companyId: string,
  ): Promise<SiteResponseDto> {
    await this.requireCompanyLocation(locationId, companyId);

    try {
      return await this.prisma.site.create({
        data: {
          locationId,
          name: dto.name,
        },
        select: {
          id: true,
          locationId: true,
          name: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Site name already exists in this location',
        );
      }

      throw error;
    }
  }

  async updateSite(
    locationId: string,
    siteId: string,
    dto: UpdateSiteDto,
    companyId: string,
  ): Promise<SiteResponseDto> {
    await this.requireCompanySite(locationId, siteId, companyId);

    try {
      return await this.prisma.site.update({
        where: { id: siteId },
        data: { name: dto.name },
        select: {
          id: true,
          locationId: true,
          name: true,
          isActive: true,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Site name already exists in this location',
        );
      }

      throw error;
    }
  }

  async deactivateSite(
    locationId: string,
    siteId: string,
    companyId: string,
  ): Promise<SiteResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const site = await tx.site.findFirst({
          where: {
            id: siteId,
            locationId,
            location: { companyId },
          },
          select: { id: true },
        });

        if (!site) throw new NotFoundException('Site not found');

        const carsAtSite = await tx.car.count({
          where: { companyId, currentSiteId: siteId },
        });
        if (carsAtSite > 0) {
          throw new ConflictException(
            'Site cannot be deactivated while cars are located on it',
          );
        }

        return tx.site.update({
          where: { id: siteId },
          data: { isActive: false },
          select: {
            id: true,
            locationId: true,
            name: true,
            isActive: true,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async findAll(scope: LocationAuthScope): Promise<LocationResponseDto[]> {
    const locations = await this.prisma.location.findMany({
      where: {
        companyId: scope.companyId,
        userAccesses: { some: { userId: scope.userId } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });

    return locations.map((location) => ({ ...location }));
  }

  async findSites(
    locationId: string,
    scope: LocationAuthScope,
  ): Promise<SiteResponseDto[]> {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        companyId: scope.companyId,
        userAccesses: { some: { userId: scope.userId } },
      },
      select: { id: true },
    });

    if (!location) throw new NotFoundException('Location not found');

    const sites = await this.prisma.site.findMany({
      where: { locationId: location.id },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        locationId: true,
        name: true,
        isActive: true,
      },
    });

    return sites.map((site) => ({ ...site }));
  }

  private async requireCompanyLocation(
    locationId: string,
    companyId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, companyId },
      select: { id: true },
    });

    if (!location) throw new NotFoundException('Location not found');
  }

  private async requireCompanySite(
    locationId: string,
    siteId: string,
    companyId: string,
  ): Promise<void> {
    const site = await this.prisma.site.findFirst({
      where: {
        id: siteId,
        locationId,
        location: { companyId },
      },
      select: { id: true },
    });

    if (!site) throw new NotFoundException('Site not found');
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
