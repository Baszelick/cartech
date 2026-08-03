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
        select: {
          id: true,
          isActive: true,
          roles: { select: { role: true } },
          locationAccesses: { select: { locationId: true } },
        },
      });

      if (!targetUser) throw new NotFoundException('User not found');

      const isOwner = actor.roles.includes(UserRole.SYSTEM_OWNER);
      const managerScopeIds = isOwner
        ? []
        : await this.validateManagerScope(tx, targetUser, actor);
      const allowedLocations = dto.locationIds.length
        ? await tx.location.findMany({
            where: {
              companyId: actor.companyId,
              isActive: true,
              id: {
                in: isOwner
                  ? dto.locationIds
                  : dto.locationIds.filter((id) =>
                      managerScopeIds.includes(id),
                    ),
              },
            },
            select: { id: true },
          })
        : [];

      if (allowedLocations.length !== dto.locationIds.length) {
        throw new BadRequestException(
          'One or more locations are unavailable',
        );
      }

      const existingIds = targetUser.locationAccesses.map(
        ({ locationId }) => locationId,
      );
      const finalIds = isOwner
        ? [...dto.locationIds]
        : [
            ...existingIds.filter(
              (locationId) => !managerScopeIds.includes(locationId),
            ),
            ...dto.locationIds,
          ];

      if (targetUser.isActive && finalIds.length === 0) {
        throw new BadRequestException(
          'An active user must have at least one location',
        );
      }

      if (isOwner) {
        await tx.userLocationAccess.deleteMany({
          where: { userId: targetUser.id },
        });
      } else {
        await tx.userLocationAccess.deleteMany({
          where: {
            userId: targetUser.id,
            locationId: { in: managerScopeIds },
          },
        });
      }

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

  private async validateManagerScope(
    tx: any,
    targetUser: {
      id: string;
      roles: Array<{ role: UserRole }>;
      locationAccesses: Array<{ locationId: string }>;
    },
    actor: AuthenticatedUser,
  ): Promise<string[]> {
    const targetRoles = targetUser.roles.map(({ role }) => role);
    if (
      targetRoles.length !== 1 ||
      targetRoles[0] !== UserRole.TECHNICIAN
    ) {
      throw new ForbiddenException(
        'Operations manager can manage only a single-role technician',
      );
    }
    const managerAccesses = await tx.userLocationAccess.findMany({
      where: { userId: actor.userId },
      select: { locationId: true },
    });
    const managerIds = managerAccesses.map(
      ({ locationId }: { locationId: string }) => locationId,
    );
    if (
      !targetUser.locationAccesses.some(({ locationId }) =>
        managerIds.includes(locationId),
      )
    ) {
      throw new ForbiddenException(
        'Operations manager has no shared location with this technician',
      );
    }
    return managerIds;
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
