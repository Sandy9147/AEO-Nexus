import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard, RequestWithUser } from './guards/jwt-auth.guard';
import { RateLimiterGuard, RateLimit } from './guards/rate-limiter.guard';
import {
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
} from '@aeo-nexus/contracts';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '@aeo-nexus/auth';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractClientInfo(req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';
    return { ipAddress, userAgent };
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  private extractRefreshToken(req: Request, body?: { refreshToken?: string }): string | undefined {
    if (body?.refreshToken) {
      return body.refreshToken;
    }
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(^|;\\s*)${REFRESH_COOKIE_NAME}=([^;]+)`));
      if (match) {
        return decodeURIComponent(match[2]);
      }
    }
    return (req as unknown as { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE_NAME];
  }

  @Post('register')
  @UseGuards(RateLimiterGuard)
  @RateLimit(5, 60)
  async register(@Req() req: Request, @Body() body: RegisterRequest) {
    const clientInfo = this.extractClientInfo(req);
    const result = await this.authService.register(body, clientInfo);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @RateLimit(10, 60)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: LoginRequest,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const result = await this.authService.login(body, clientInfo);

    if (result.tokens.refreshToken) {
      this.setRefreshCookie(res, result.tokens.refreshToken);
    }

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: RefreshTokenRequest,
  ) {
    const clientInfo = this.extractClientInfo(req);
    const token = this.extractRefreshToken(req, body);
    const result = await this.authService.refresh(token || '', clientInfo);

    if (result.tokens.refreshToken) {
      this.setRefreshCookie(res, result.tokens.refreshToken);
    }

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: RefreshTokenRequest,
  ) {
    const token = this.extractRefreshToken(req, body);
    await this.authService.logout(token);
    this.clearRefreshCookie(res);

    return {
      success: true,
      data: { loggedOut: true },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailRequest) {
    const result = await this.authService.verifyEmail(body.token);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @RateLimit(3, 60)
  async resendVerification(@Body() body: ResendVerificationRequest) {
    const result = await this.authService.resendVerification(body.email);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @RateLimit(5, 60)
  async forgotPassword(@Body() body: ForgotPasswordRequest) {
    const result = await this.authService.forgotPassword(body.email);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimiterGuard)
  @RateLimit(5, 60)
  async resetPassword(@Body() body: ResetPasswordRequest) {
    const result = await this.authService.resetPassword(body.token, body.newPassword);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: RequestWithUser) {
    const profile = await this.authService.getProfile(req.user.id);
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@Req() req: RequestWithUser) {
    const cookieToken = this.extractRefreshToken(req as unknown as Request);
    const sessions = await this.authService.listSessions(req.user.id, cookieToken);
    return {
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(@Req() req: RequestWithUser, @Param('id') sessionId: string) {
    const result = await this.authService.revokeSession(req.user.id, sessionId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  async revokeAllOtherSessions(@Req() req: RequestWithUser) {
    const cookieToken = this.extractRefreshToken(req as unknown as Request);
    const result = await this.authService.revokeAllOtherSessions(req.user.id, cookieToken);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
