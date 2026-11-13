import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequest, RegisterRequest } from '@aeo-nexus/contracts';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest) {
    const result = await this.authService.login(body);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register')
  async register(@Body() body: RegisterRequest) {
    const result = await this.authService.register(body);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
