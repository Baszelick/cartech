import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UserRolesResponseDto } from './dto/user-roles-response.dto';

@Injectable()
export class UserRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(
    targetUserId: string,
    companyId: string,
  ): Promise<UserRolesResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId },
      select: {
        id: true,
        roles: {
          orderBy: { role: 'asc' },
          select: { role: true },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      userId: user.id,
      roles: user.roles.map(({ role }) => role),
    };
  }

  async replaceForUser(
    targetUserId: string,
    dto: UpdateUserRolesDto,
    actor: AuthenticatedUser,
  ): Promise<UserRolesResponseDto> {
    this.validateRoleSet(dto.roles);

    return this.prisma.$transaction(
      async (tx) => {
        const targetUser = await tx.user.findFirst({
          where: { id: targetUserId, companyId: actor.companyId },
          select: {
            id: true,
            roles: {
              orderBy: { role: 'asc' },
              select: { role: true },
            },
          },
        });

        if (!targetUser) throw new NotFoundException('User not found');

        const currentRoles = targetUser.roles.map(({ role }) => role);
        this.validateActorPolicy(targetUserId, currentRoles, dto.roles, actor);

        if (
          currentRoles.includes(UserRole.SYSTEM_OWNER) &&
          !dto.roles.includes(UserRole.SYSTEM_OWNER)
        ) {
          const otherOwnerCount = await tx.userRoleAssignment.count({
            where: {
              role: UserRole.SYSTEM_OWNER,
              userId: { not: targetUserId },
              user: { companyId: actor.companyId },
            },
          });

          if (otherOwnerCount === 0) {
            throw new ConflictException(
              'The last system owner in a company cannot be removed',
            );
          }
        }

        await tx.userRoleAssignment.deleteMany({
          where: { userId: targetUserId },
        });
        await tx.userRoleAssignment.createMany({
          data: dto.roles.map((role) => ({ userId: targetUserId, role })),
        });
        await tx.authSession.deleteMany({
          where: { userId: targetUserId },
        });

        return {
          userId: targetUserId,
          roles: this.sortRoles(dto.roles),
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private validateRoleSet(roles: UserRole[]): void {
    if (roles.length === 0) {
      throw new BadRequestException('At least one role is required');
    }

    if (new Set(roles).size !== roles.length) {
      throw new BadRequestException('Roles must be unique');
    }
  }

  private validateActorPolicy(
    targetUserId: string,
    currentRoles: UserRole[],
    nextRoles: UserRole[],
    actor: AuthenticatedUser,
  ): void {
    const isOwner = actor.roles.includes(UserRole.SYSTEM_OWNER);
    const isManager = actor.roles.includes(UserRole.OPERATIONS_MANAGER);

    if (!isOwner && isManager) {
      if (targetUserId === actor.userId) {
        throw new ForbiddenException(
          'Operations manager cannot change own roles',
        );
      }

      const ownerRoleChanged =
        currentRoles.includes(UserRole.SYSTEM_OWNER) !==
        nextRoles.includes(UserRole.SYSTEM_OWNER);
      if (ownerRoleChanged) {
        throw new ForbiddenException(
          'Operations manager cannot assign or remove system owner',
        );
      }
    }
  }

  private sortRoles(roles: UserRole[]): UserRole[] {
    return [...roles].sort((left, right) => left.localeCompare(right));
  }
}
