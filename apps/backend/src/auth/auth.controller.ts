import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './token.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly refreshCookieName: string;
  private readonly refreshTokenTtlMs: number;
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    this.refreshCookieName = this.configService.getOrThrow<string>(
      'REFRESH_COOKIE_NAME',
    );
    this.refreshTokenTtlMs = parseInt(
      this.configService.getOrThrow<string>('REFRESH_TOKEN_TTL_MS'),
      10,
    );
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(this.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict' as const,
      path: '/auth',
      maxAge: this.refreshTokenTtlMs,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.refreshCookieName, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict' as const,
      path: '/auth',
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Вход в систему',
    description:
      'Аутентификация пользователя по username/password. Возвращает JWT-токен и данные пользователя.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Успешная аутентификация. Возвращает accessToken и user.',
  })
  @ApiUnauthorizedResponse({ description: 'Неверные учетные данные.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление токена',
    description:
      'Обновляет access token с помощью refresh token из HttpOnly cookie.',
  })
  @ApiOkResponse({
    description: 'Успешное обновление. Возвращает новый accessToken и user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Неверный или истекший refresh token.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined =
      req.cookies?.[this.refreshCookieName];
    if (!refreshToken) {
      this.clearRefreshCookie(res);
      return { statusCode: 401, message: 'Refresh token not found' };
    }
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Выход из системы',
    description: 'Отзывает текущую сессию и очищает refresh cookie.',
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: string | undefined =
      req.cookies?.[this.refreshCookieName];
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Текущий пользователь',
    description: 'Возвращает данные аутентифицированного пользователя.',
  })
  @ApiOkResponse({ description: 'Данные пользователя.' })
  @ApiUnauthorizedResponse({ description: 'Не авторизован.' })
  async getMe(@Req() req: AuthenticatedRequest) {
    const userData = await this.authService.getMe(req.user.userId);
    return userData;
  }
}
