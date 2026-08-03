import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';
import type { UserRole } from '../../generated/prisma/client';

export const publicUserSelect = {
  id: true,
  companyId: true,
  username: true,
  firstName: true,
  lastName: true,
  mustChangePassword: true,
  roles: {
    select: {
      role: true,
    },
  },
} as const;

interface PublicUserSource {
  id: string;
  companyId: string;
  username: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  roles: Array<{ role: UserRole }>;
}

@Injectable()
export class AuthService {
  private readonly refreshCookieName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    this.refreshCookieName = this.configService.getOrThrow<string>(
      'REFRESH_COOKIE_NAME',
    );
  }

  async login(loginDto: LoginDto) {
    const { companyCode, password } = loginDto;
    const username = loginDto.username.trim().toLowerCase();

    const company = await this.prisma.company.findUnique({
      where: { code: companyCode },
      select: { id: true, isActive: true },
    });

    if (!company || !company.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        companyId_username: {
          companyId: company.id,
          username,
        },
      },
      include: {
        roles: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresAt = new Date(
      Date.now() + this.tokenService.refreshExpiresInMs,
    );

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'placeholder',
        expiresAt,
      },
    });

    const refreshToken = await this.tokenService.createRefreshToken(
      user.id,
      session.id,
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { refreshTokenHash },
    });

    const publicUser = this.toPublicUser(user);
    const accessToken = await this.tokenService.createAccessToken(publicUser);

    return {
      accessToken,
      refreshToken,
      refreshCookieName: this.refreshCookieName,
      user: publicUser,
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          include: {
            roles: {
              select: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt < new Date() ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isTokenValid = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );

    if (!isTokenValid) {
      // Possible token reuse attack — revoke session
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const newRefreshToken = await this.tokenService.createRefreshToken(
      session.userId,
      session.id,
    );
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    const newExpiresAt = new Date(
      Date.now() + this.tokenService.refreshExpiresInMs,
    );

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    const publicUser = this.toPublicUser(session.user);
    const accessToken = await this.tokenService.createAccessToken(publicUser);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshCookieName: this.refreshCookieName,
      user: publicUser,
    };
  }

  async logout(refreshToken: string | undefined) {
    if (refreshToken) {
      try {
        const payload =
          await this.tokenService.verifyRefreshToken(refreshToken);

        await this.prisma.authSession.updateMany({
          where: {
            id: payload.sessionId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Token is invalid — still clear cookie
      }
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: publicUserSelect,
    });

    return this.toPublicUser(user);
  }

  async changeInitialPassword(userId: string, newPassword: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: {
            roles: { select: { role: true } },
          },
        });
        if (!user || !user.isActive) {
          throw new UnauthorizedException('User is inactive or unavailable');
        }
        if (!user.mustChangePassword) {
          throw new BadRequestException(
            'Initial password change is not required',
          );
        }
        if (await bcrypt.compare(newPassword, user.passwordHash)) {
          throw new BadRequestException(
            'New password must differ from the temporary password',
          );
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, mustChangePassword: false },
          include: {
            roles: { select: { role: true } },
          },
        });
        await tx.authSession.deleteMany({ where: { userId: user.id } });

        const session = await tx.authSession.create({
          data: {
            userId: user.id,
            refreshTokenHash: 'placeholder',
            expiresAt: new Date(
              Date.now() + this.tokenService.refreshExpiresInMs,
            ),
          },
        });
        const refreshToken = await this.tokenService.createRefreshToken(
          user.id,
          session.id,
        );
        await tx.authSession.update({
          where: { id: session.id },
          data: {
            refreshTokenHash: await bcrypt.hash(refreshToken, 10),
          },
        });

        const publicUser = this.toPublicUser(updatedUser);
        return {
          accessToken:
            await this.tokenService.createAccessToken(publicUser),
          refreshToken,
          refreshCookieName: this.refreshCookieName,
          user: publicUser,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private toPublicUser(user: PublicUserSource) {
    return {
      id: user.id,
      companyId: user.companyId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map(({ role }) => role),
      mustChangePassword: user.mustChangePassword,
    };
  }
}
