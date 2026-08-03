import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { ActivateUserDto } from './dto/activate-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PasswordResetResponseDto,
  UserCreatedResponseDto,
} from './dto/user-created-response.dto';

@Injectable()
export class UserPersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserCreatedResponseDto> {
    this.validateCreationPolicy(dto.roles, actor.roles);
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const locationCount = await tx.location.count({
            where: {
              id: { in: dto.locationIds },
              companyId: actor.companyId,
              isActive: true,
            },
          });
          if (locationCount !== dto.locationIds.length) {
            throw new BadRequestException(
              'Every location must exist, be active, and belong to the company',
            );
          }

          const user = await tx.user.create({
            data: {
              companyId: actor.companyId,
              username: dto.username,
              firstName: dto.firstName,
              lastName: dto.lastName,
              passwordHash,
              isActive: true,
              mustChangePassword: true,
            },
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              isActive: true,
              mustChangePassword: true,
            },
          });

          await tx.userRoleAssignment.createMany({
            data: dto.roles.map((role) => ({ userId: user.id, role })),
          });
          await tx.userLocationAccess.createMany({
            data: dto.locationIds.map((locationId) => ({
              userId: user.id,
              locationId,
            })),
          });

          return {
            ...user,
            roles: this.sortRoles(dto.roles),
            locationIds: [...dto.locationIds],
          };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Username already exists in this company',
        );
      }
      throw error;
    }
  }

  async resetPassword(
    targetUserId: string,
    dto: ResetUserPasswordDto,
    actor: AuthenticatedUser,
  ): Promise<PasswordResetResponseDto> {
    if (targetUserId === actor.userId) {
      throw new ForbiddenException(
        'Administrative password reset cannot target the current user',
      );
    }
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);

    return this.prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findFirst({
          where: { id: targetUserId, companyId: actor.companyId },
          select: {
            id: true,
            isActive: true,
            roles: { select: { role: true } },
          },
        });
        if (!target) throw new NotFoundException('User not found');
        if (!target.isActive) {
          throw new BadRequestException(
            'Password cannot be reset for an inactive user',
          );
        }

        this.validateResetPolicy(
          target.roles.map(({ role }) => role),
          actor.roles,
        );

        await tx.user.update({
          where: { id: target.id },
          data: { passwordHash, mustChangePassword: true },
        });
        await tx.authSession.deleteMany({ where: { userId: target.id } });

        return { userId: target.id, mustChangePassword: true };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async update(
    targetUserId: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ) {
    if (
      dto.username === undefined &&
      dto.firstName === undefined &&
      dto.lastName === undefined
    ) {
      throw new BadRequestException('At least one field is required');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = await this.findManageableUser(
          tx,
          targetUserId,
          actor,
        );
        const user = await tx.user.update({
          where: { id: target.id },
          data: dto,
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
            mustChangePassword: true,
          },
        });
        return {
          ...user,
          roles: target.roles.map(({ role }) => role),
        };
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Username already exists in this company',
        );
      }
      throw error;
    }
  }

  async deactivate(targetUserId: string, actor: AuthenticatedUser) {
    if (targetUserId === actor.userId) {
      throw new ForbiddenException('A user cannot deactivate themselves');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const target = await this.findManageableUser(
          tx,
          targetUserId,
          actor,
        );
        if (!target.isActive) {
          throw new ConflictException('User is already inactive');
        }
        if (
          target.roles.some(({ role }) => role === UserRole.SYSTEM_OWNER)
        ) {
          const otherOwnerCount = await tx.userRoleAssignment.count({
            where: {
              role: UserRole.SYSTEM_OWNER,
              userId: { not: target.id },
              user: { companyId: actor.companyId, isActive: true },
            },
          });
          if (otherOwnerCount === 0) {
            throw new ConflictException(
              'The last active system owner cannot be deactivated',
            );
          }
        }

        const user = await tx.user.update({
          where: { id: target.id },
          data: { isActive: false },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
            mustChangePassword: true,
          },
        });
        await tx.authSession.deleteMany({ where: { userId: target.id } });
        return {
          ...user,
          roles: target.roles.map(({ role }) => role),
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async activate(
    targetUserId: string,
    dto: ActivateUserDto,
    actor: AuthenticatedUser,
  ) {
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 10);
    return this.prisma.$transaction(async (tx) => {
      const target = await this.findManageableUser(
        tx,
        targetUserId,
        actor,
      );
      if (target.isActive) {
        throw new ConflictException('User is already active');
      }
      const user = await tx.user.update({
        where: { id: target.id },
        data: {
          isActive: true,
          passwordHash,
          mustChangePassword: true,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
          mustChangePassword: true,
        },
      });
      await tx.authSession.deleteMany({ where: { userId: target.id } });
      return {
        ...user,
        roles: target.roles.map(({ role }) => role),
      };
    });
  }

  private validateCreationPolicy(
    roles: UserRole[],
    actorRoles: UserRole[],
  ): void {
    if (new Set(roles).size !== roles.length || roles.length === 0) {
      throw new BadRequestException('Roles must be non-empty and unique');
    }
    if (
      !actorRoles.includes(UserRole.SYSTEM_OWNER) &&
      (roles.length !== 1 || roles[0] !== UserRole.TECHNICIAN)
    ) {
      throw new ForbiddenException(
        'Operations manager can create only a single-role technician',
      );
    }
  }

  private validateResetPolicy(
    targetRoles: UserRole[],
    actorRoles: UserRole[],
  ): void {
    if (actorRoles.includes(UserRole.SYSTEM_OWNER)) return;
    if (
      targetRoles.length !== 1 ||
      targetRoles[0] !== UserRole.TECHNICIAN
    ) {
      throw new ForbiddenException(
        'Operations manager can reset only a single-role technician',
      );
    }
  }

  private async findManageableUser(
    tx: any,
    targetUserId: string,
    actor: AuthenticatedUser,
  ) {
    const target = await tx.user.findFirst({
      where: { id: targetUserId, companyId: actor.companyId },
      select: {
        id: true,
        isActive: true,
        roles: { select: { role: true } },
        locationAccesses: { select: { locationId: true } },
      },
    });
    if (!target) throw new NotFoundException('User not found');
    if (actor.roles.includes(UserRole.SYSTEM_OWNER)) return target;
    if (targetUserId === actor.userId) {
      throw new ForbiddenException(
        'Operations manager cannot manage themselves',
      );
    }
    const targetRoles = target.roles.map(
      ({ role }: { role: UserRole }) => role,
    );
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
    const managerLocationIds = new Set(
      managerAccesses.map(
        ({ locationId }: { locationId: string }) => locationId,
      ),
    );
    if (
      !target.locationAccesses.some(
        ({ locationId }: { locationId: string }) =>
          managerLocationIds.has(locationId),
      )
    ) {
      throw new ForbiddenException(
        'Operations manager has no shared location with this technician',
      );
    }
    return target;
  }

  private sortRoles(roles: UserRole[]): UserRole[] {
    return [...roles].sort((left, right) => left.localeCompare(right));
  }

  private isUniqueConstraintError(error: unknown): error is { code: 'P2002' } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
