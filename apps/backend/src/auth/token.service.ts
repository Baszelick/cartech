import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';
import type { UserRole } from '../../generated/prisma/client';

interface TokenConfig {
  secret: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessConfig: TokenConfig;
  private readonly refreshConfig: TokenConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessConfig = {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.parseExpiresIn(
        this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
      ),
    };

    this.refreshConfig = {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.parseExpiresIn(
        this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
      ),
    };
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiresIn format: ${value}`);
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 3600 * 1000;
      case 'd':
        return amount * 86400 * 1000;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  get accessExpiresInMs(): number {
    return this.accessConfig.expiresIn;
  }

  get refreshExpiresInMs(): number {
    return this.refreshConfig.expiresIn;
  }

  async createAccessToken(user: {
    id: string;
    companyId: string;
    username: string;
    roles: UserRole[];
  }): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      companyId: user.companyId,
      username: user.username,
      roles: user.roles,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.accessConfig.secret,
      expiresIn: this.accessConfig.expiresIn / 1000,
    });
  }

  async createRefreshToken(userId: string, sessionId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      sessionId,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.refreshConfig.secret,
      expiresIn: this.refreshConfig.expiresIn / 1000,
    });
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: this.refreshConfig.secret,
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
