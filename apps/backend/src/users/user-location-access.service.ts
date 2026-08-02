import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserLocationAccessDto } from './dto/update-user-location-access.dto';
import {
  UserLocationAccessItemDto,
  UserLocationAccessResponseDto,
} from './dto/user-location-access-response.dto';

const LOCATION_SELECT = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} as const;

@Injectable()
export class UserLocationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(
    targetUserId: string,
    companyId: string,
  ): Promise<UserLocationAccessResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId },
      select: { id: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const locations = await this.prisma.location.findMany({
      where: {
        companyId,
        userAccesses: { some: { userId: user.id } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: LOCATION_SELECT,
    });

    return this.toResponse(user.id, locations);
  }

  async replaceForUser(
    targetUserId: string,
    dto: UpdateUserLocationAccessDto,
    actor: AuthenticatedUser,
  ): Promise<UserLocationAccessResponseDto> {
    this.validateDuplicates(dto.locationIds);
    this.validateSelfUpdate(targetUserId, actor);

    return this.prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, companyId: actor.companyId },
        select: { id: true },
      });

      if (!targetUser) throw new NotFoundException('User not found');

      const locations = dto.locationIds.length
        ? await tx.location.findMany({
            where: {
              companyId: actor.companyId,
              id: { in: dto.locationIds },
            },
            select: { id: true },
          })
        : [];

      if (locations.length !== dto.locationIds.length) {
        throw new BadRequestException(
          'One or more locations are invalid for this company',
        );
      }

      await tx.userLocationAccess.deleteMany({
        where: { userId: targetUser.id },
      });

      if (dto.locationIds.length) {
        await tx.userLocationAccess.createMany({
          data: dto.locationIds.map((locationId) => ({
            userId: targetUser.id,
            locationId,
          })),
        });
      }

      const assignedLocations = await tx.location.findMany({
        where: {
          companyId: actor.companyId,
          userAccesses: { some: { userId: targetUser.id } },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: LOCATION_SELECT,
      });

      return this.toResponse(targetUser.id, assignedLocations);
    });
  }

  private validateDuplicates(locationIds: string[]): void {
    if (new Set(locationIds).size !== locationIds.length) {
      throw new BadRequestException('locationIds must be unique');
    }
  }

  private validateSelfUpdate(
    targetUserId: string,
    actor: AuthenticatedUser,
  ): void {
    const isOwner = actor.roles.includes(UserRole.SYSTEM_OWNER);
    const isManager = actor.roles.includes(UserRole.OPERATIONS_MANAGER);

    if (targetUserId === actor.userId && isManager && !isOwner) {
      throw new ForbiddenException(
        'Operations manager cannot change own location access',
      );
    }
  }

  private toResponse(
    userId: string,
    locations: UserLocationAccessItemDto[],
  ): UserLocationAccessResponseDto {
    return {
      userId,
      locations: locations.map(({ id, code, name, isActive }) => ({
        id,
        code,
        name,
        isActive,
      })),
    };
  }
}
