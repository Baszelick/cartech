import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
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
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './token.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import {
  AuthSessionResponseDto,
  AuthUserResponseDto,
} from './dto/auth-response.dto';
import { HttpErrorResponseDto } from '../common/dto/http-error-response.dto';

@ApiTags('Авторизация')
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
    summary: 'Войти в систему',
    description:
      'Аутентифицирует пользователя в рамках компании, возвращает access-токен и сохраняет refresh-токен в HttpOnly cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Аутентификация выполнена успешно.',
    type: AuthSessionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Запрос не прошёл валидацию.',
    type: HttpErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Неверные учётные данные или неактивный пользователь.',
    type: HttpErrorResponseDto,
  })
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
    summary: 'Обновить сессию',
    description:
      'Ротирует refresh-токен из HttpOnly cookie и возвращает новый access-токен.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiOkResponse({
    description: 'Сессия успешно обновлена.',
    type: AuthSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Refresh cookie отсутствует, недействителен, просрочен или уже использован.',
    type: HttpErrorResponseDto,
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined =
      req.cookies?.[this.refreshCookieName];
    if (!refreshToken) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Refresh token not found');
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
    summary: 'Выйти из системы',
    description:
      'Отзывает текущую сессию при наличии refresh cookie и очищает cookie.',
  })
  @ApiCookieAuth('refreshToken')
  @ApiNoContentResponse({
    description: 'Сессия завершена, cookie очищен.',
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
    summary: 'Получить текущего пользователя',
    description:
      'Возвращает аутентифицированного пользователя и назначенные ему роли.',
  })
  @ApiOkResponse({
    description: 'Текущий пользователь.',
    type: AuthUserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Access-токен отсутствует или недействителен.',
    type: HttpErrorResponseDto,
  })
  async getMe(@Req() req: AuthenticatedRequest) {
    const userData = await this.authService.getMe(req.user.userId);
    return userData;
  }
}
