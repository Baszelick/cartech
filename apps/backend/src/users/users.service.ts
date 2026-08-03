import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UserDetailsResponseDto } from './dto/user-details-response.dto';
import { UserListItemResponseDto } from './dto/user-list-item-response.dto';

const USER_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  isActive: true,
  mustChangePassword: true,
  roles: {
    orderBy: { role: 'asc' as const },
    select: { role: true },
  },
} as const;

type UserRecord = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: Array<{ role: UserRole }>;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string): Promise<UserListItemResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
        { username: 'asc' },
        { id: 'asc' },
      ],
      select: USER_SELECT,
    });

    return users.map((user) => this.toResponse(user));
  }

  async findById(
    userId: string,
    companyId: string,
  ): Promise<UserDetailsResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return this.toResponse(user);
  }

  private toResponse(user: UserRecord): UserListItemResponseDto {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles.map(({ role }) => role),
    };
  }
}
