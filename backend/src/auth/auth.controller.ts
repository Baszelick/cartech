import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему', description: 'Аутентификация пользователя по username/password. Возвращает JWT-токен и данные пользователя.' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Успешная аутентификация. Возвращает accessToken и user.' })
  @ApiUnauthorizedResponse({ description: 'Неверные учетные данные.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
