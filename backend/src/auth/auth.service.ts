import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcrypt';

export const publicUserSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

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
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
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

    const accessToken = await this.tokenService.createAccessToken(user);

    return {
      accessToken,
      refreshToken,
      refreshCookieName: this.refreshCookieName,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt < new Date()
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

    const accessToken = await this.tokenService.createAccessToken(session.user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshCookieName: this.refreshCookieName,
      user: {
        id: session.user.id,
        username: session.user.username,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
      },
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

    return user;
  }
}
