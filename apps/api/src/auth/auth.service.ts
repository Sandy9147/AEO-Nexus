import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  LoginResult,
  MfaLoginRequest,
  MfaVerifyRequest,
  MfaDisableRequest,
  UserProfile,
  SessionInfo,
} from '@aeo-nexus/contracts';
import {
  signJwtHmacSha256,
  verifyJwtHmacSha256,
  generateOpaqueToken,
  hashToken,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  EMAIL_VERIFICATION_TTL_SECONDS,
  PASSWORD_RESET_TTL_SECONDS,
} from '@aeo-nexus/auth';
import { MfaService } from './mfa.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly mfaService: MfaService,
  ) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be configured with at least 32 characters of high-entropy secret material.',
      );
    }
    return secret;
  }

  /**
   * User Registration with email verification dispatch
   */
  async register(
    dto: RegisterRequest,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ message: string; user: UserProfile }> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        emailVerified: false,
        isActive: true,
      },
    });

    // Create Email Verification Token
    const rawVerificationToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Dispatch verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      rawVerificationToken,
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:register',
        resource: 'user',
        ipAddress: clientInfo?.ipAddress,
        details: { email: user.email },
      },
    });

    return {
      message: 'Registration successful. Please verify your email address to log in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        platformRole: user.platformRole,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }

  /**
   * Helper to create session, audit log, and return LoginResponse
   */
  private async createSessionAndTokens(
    user: any,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponse> {
    const secret = this.getJwtSecret();
    const accessToken = signJwtHmacSha256(
      {
        sub: user.id,
        email: user.email,
        platformRole: user.platformRole,
        iss: 'aeo-nexus-api',
        aud: 'aeo-nexus-clients',
        exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
      },
      secret,
    );

    const rawRefreshToken = generateOpaqueToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:login',
        resource: 'session',
        ipAddress: clientInfo?.ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        platformRole: user.platformRole,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
      activeWorkspaces: (user.memberships || [])
        .filter((m: any) => m.isActive && m.workspace?.isActive)
        .map((m: any) => ({
          id: m.workspaceId,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: m.role,
        })),
    };
  }

  /**
   * User Login with verification gate, session creation, and refresh token rotation.
   * Multi-Factor Authentication is enforced for administrator roles and users with MFA enabled.
   */
  async login(
    dto: LoginRequest,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResult> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Require verified email
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please verify your email address before logging in.',
      );
    }

    const secret = this.getJwtSecret();
    const isAdmin =
      user.platformRole === 'PLATFORM_SUPER_ADMIN' ||
      user.platformRole === 'PLATFORM_ADMIN' ||
      user.platformRole === 'SUPERADMIN';

    // Administrator MFA Enforcement or user-enabled MFA
    if (user.mfaEnabled || isAdmin) {
      if (!user.mfaEnabled && isAdmin) {
        // Force MFA enrollment for admins before production access
        const mfaTicket = signJwtHmacSha256(
          {
            sub: user.id,
            email: user.email,
            type: 'mfa_setup_challenge',
            exp: Math.floor(Date.now() / 1000) + 600,
          },
          secret,
        );

        return {
          mfaRequired: true,
          mfaSetupRequired: true,
          mfaTicket,
          message:
            'MFA is mandatory for administrative accounts. Please set up MFA to complete login.',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            platformRole: user.platformRole,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
          },
        } as any;
      }

      // MFA is enabled on user account
      if (dto.mfaCode) {
        const { valid, usedCode } = this.mfaService.verifyTotp(
          user.mfaSecret || '',
          dto.mfaCode,
          user.mfaLastUsedCode,
        );
        if (!valid) {
          throw new UnauthorizedException('Invalid or expired MFA code');
        }
        await this.prisma.user.update({
          where: { id: user.id },
          data: { mfaLastUsedCode: usedCode },
        });
      } else if (dto.recoveryCode) {
        const { valid, remainingHashedCodes } = this.mfaService.verifyAndConsumeRecoveryCode(
          dto.recoveryCode,
          user.mfaRecoveryCodes || [],
        );
        if (!valid) {
          throw new UnauthorizedException('Invalid or already used recovery code');
        }
        await this.prisma.user.update({
          where: { id: user.id },
          data: { mfaRecoveryCodes: remainingHashedCodes },
        });
      } else {
        // Return MFA challenge
        const mfaTicket = signJwtHmacSha256(
          {
            sub: user.id,
            email: user.email,
            type: 'mfa_challenge',
            exp: Math.floor(Date.now() / 1000) + 300,
          },
          secret,
        );

        return {
          mfaRequired: true,
          mfaTicket,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            platformRole: user.platformRole,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
          },
        };
      }
    }

    return this.createSessionAndTokens(user, clientInfo);
  }

  /**
   * Complete MFA login challenge with TOTP code or recovery code
   */
  async mfaLogin(
    dto: MfaLoginRequest,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponse> {
    const secret = this.getJwtSecret();
    let payload: { sub: string; email: string; type: string };
    try {
      payload = verifyJwtHmacSha256<{ sub: string; email: string; type: string }>(
        dto.mfaTicket,
        secret,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA ticket');
    }

    if (payload.type !== 'mfa_challenge') {
      throw new UnauthorizedException('Invalid MFA ticket purpose');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or deactivated');
    }

    if (dto.code) {
      const { valid, usedCode } = this.mfaService.verifyTotp(
        user.mfaSecret || '',
        dto.code,
        user.mfaLastUsedCode,
      );
      if (!valid) {
        throw new UnauthorizedException('Invalid or expired MFA code');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaLastUsedCode: usedCode },
      });
    } else if (dto.recoveryCode) {
      const { valid, remainingHashedCodes } = this.mfaService.verifyAndConsumeRecoveryCode(
        dto.recoveryCode,
        user.mfaRecoveryCodes || [],
      );
      if (!valid) {
        throw new UnauthorizedException('Invalid or already used recovery code');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaRecoveryCodes: remainingHashedCodes },
      });
    } else {
      throw new BadRequestException('MFA verification code or recovery code is required');
    }

    return this.createSessionAndTokens(user, clientInfo);
  }

  /**
   * Initiate MFA setup for authenticated user
   */
  async setupMfa(userId: string): Promise<{ secret: string; otpauthUri: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = this.mfaService.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    const otpauthUri = this.mfaService.getOtpAuthUri(secret, user.email);
    return { secret, otpauthUri };
  }

  /**
   * Verify and enable MFA with TOTP code
   */
  async verifyAndEnableMfa(
    userId: string,
    code: string,
  ): Promise<{ enabled: boolean; recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup has not been initiated');
    }

    const { valid, usedCode } = this.mfaService.verifyTotp(user.mfaSecret, code);
    if (!valid) {
      throw new BadRequestException(
        'Invalid verification code. Please check your authenticator and try again.',
      );
    }

    const { plaintextCodes, hashedCodes } = this.mfaService.generateRecoveryCodes(10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaRecoveryCodes: hashedCodes,
        mfaEnrolledAt: new Date(),
        mfaLastUsedCode: usedCode,
      },
    });

    return { enabled: true, recoveryCodes: plaintextCodes };
  }

  /**
   * Complete MFA enrollment during admin login challenge
   */
  async completeAdminMfaSetup(
    ticket: string,
    code: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponse & { recoveryCodes: string[] }> {
    const secret = this.getJwtSecret();
    let payload: { sub: string; email: string; type: string };
    try {
      payload = verifyJwtHmacSha256<{ sub: string; email: string; type: string }>(ticket, secret);
    } catch {
      throw new UnauthorizedException('Invalid or expired MFA ticket');
    }

    if (payload.type !== 'mfa_setup_challenge') {
      throw new UnauthorizedException('Invalid MFA ticket purpose');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found or deactivated');

    let mfaSecret = user.mfaSecret;
    if (!mfaSecret) {
      mfaSecret = this.mfaService.generateSecret();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { mfaSecret },
      });
    }

    const { valid, usedCode } = this.mfaService.verifyTotp(mfaSecret, code);
    if (!valid) {
      throw new BadRequestException('Invalid verification code');
    }

    const { plaintextCodes, hashedCodes } = this.mfaService.generateRecoveryCodes(10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaRecoveryCodes: hashedCodes,
        mfaEnrolledAt: new Date(),
        mfaLastUsedCode: usedCode,
      },
    });

    const loginRes = await this.createSessionAndTokens(user, clientInfo);
    return { ...loginRes, recoveryCodes: plaintextCodes };
  }

  /**
   * Disable MFA for non-admin accounts
   */
  async disableMfa(
    userId: string,
    dto: MfaDisableRequest,
  ): Promise<{ disabled: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isAdmin =
      user.platformRole === 'PLATFORM_SUPER_ADMIN' ||
      user.platformRole === 'PLATFORM_ADMIN' ||
      user.platformRole === 'SUPERADMIN';
    if (isAdmin) {
      throw new BadRequestException(
        'MFA is mandatory for administrative accounts and cannot be disabled',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const { valid } = this.mfaService.verifyTotp(user.mfaSecret || '', dto.code);
    if (!valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [],
        mfaLastUsedCode: null,
        mfaEnrolledAt: null,
      },
    });

    return { disabled: true };
  }

  /**
   * Refresh Token Rotation with Token Reuse Detection
   */
  async refresh(
    refreshToken: string,
    clientInfo?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = hashToken(refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: { workspace: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token Reuse Detection: If token is already revoked, an adversary may have stolen it
    if (session.isRevoked) {
      this.logger.error(
        `[SECURITY WARNING] Refresh token reuse detected for user ${session.userId}. Revoking all active sessions!`,
      );

      // Invalidate all sessions for this user as a safeguard
      await this.prisma.session.updateMany({
        where: { userId: session.userId, isRevoked: false },
        data: { isRevoked: true },
      });

      // Dispatch security alert email
      await this.emailService.sendSecurityAlertEmail(
        session.user.email,
        `${session.user.firstName} ${session.user.lastName}`,
        'Multiple attempts were made to exchange an already rotated refresh token.',
      );

      throw new UnauthorizedException('Token reuse detected. All sessions have been revoked.');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    // Revoke old session (Rotation)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Create New Session with new Refresh Token
    const newRawRefreshToken = generateOpaqueToken(32);
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await this.prisma.session.create({
      data: {
        userId: session.user.id,
        tokenHash: newRefreshTokenHash,
        ipAddress: clientInfo?.ipAddress || session.ipAddress,
        userAgent: clientInfo?.userAgent || session.userAgent,
        expiresAt: newExpiresAt,
      },
    });

    // Issue New Access Token
    const secret = this.getJwtSecret();
    const accessToken = signJwtHmacSha256(
      {
        sub: session.user.id,
        email: session.user.email,
        platformRole: session.user.platformRole,
        iss: 'aeo-nexus-api',
        aud: 'aeo-nexus-clients',
        exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
      },
      secret,
    );

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        platformRole: session.user.platformRole,
        emailVerified: session.user.emailVerified,
        createdAt: session.user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken: newRawRefreshToken,
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
      activeWorkspaces: session.user.memberships
        .filter((m) => m.isActive && m.workspace.isActive)
        .map((m) => ({
          id: m.workspaceId,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: m.role,
        })),
    };
  }

  /**
   * Logout and Revoke Session
   */
  async logout(refreshToken?: string, userId?: string): Promise<{ loggedOut: boolean }> {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await this.prisma.session.updateMany({
        where: { tokenHash, isRevoked: false },
        data: { isRevoked: true },
      });
    } else if (userId) {
      await this.prisma.session.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    return { loggedOut: true };
  }

  /**
   * Verify User Email Address
   */
  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const tokenHash = hashToken(token);

    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    if (record.expiresAt <= new Date()) {
      await this.prisma.emailVerificationToken.delete({ where: { id: record.id } });
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    return {
      verified: true,
      message: 'Email successfully verified. You may now log in.',
    };
  }

  /**
   * Resend Verification Email
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && !user.emailVerified) {
      // Invalidate old tokens
      await this.prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // Issue new token
      const rawToken = generateOpaqueToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000);

      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await this.emailService.sendVerificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        rawToken,
      );
    }

    return {
      message: 'If an unverified account exists with that email, a verification link has been sent.',
    };
  }

  /**
   * Forgot Password - Request Reset Token
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isActive) {
      // Invalidate previous unused reset tokens
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, isUsed: false },
      });

      // Create new reset token
      const rawToken = generateOpaqueToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          isUsed: false,
        },
      });

      await this.emailService.sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        rawToken,
      );
    }

    return {
      message: 'If an account exists with that email, password reset instructions have been sent.',
    };
  }

  /**
   * Reset Password with Token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token) {
      throw new BadRequestException('Reset token is required');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const tokenHash = hashToken(token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.isUsed) {
      throw new BadRequestException('Invalid or already used password reset token');
    }

    if (record.expiresAt <= new Date()) {
      throw new BadRequestException('Password reset token has expired');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { isUsed: true },
      }),
      // Revoke all existing sessions on password change
      this.prisma.session.updateMany({
        where: { userId: record.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    return {
      message: 'Password has been successfully reset. Please log in with your new credentials.',
    };
  }

  /**
   * Get Current User Profile
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      platformRole: user.platformRole,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * List Active Sessions for User
   */
  async listSessions(userId: string, currentToken?: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentHash = currentToken ? hashToken(currentToken) : null;

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrent: s.tokenHash === currentHash,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));
  }

  /**
   * Revoke Specific Session
   */
  async revokeSession(userId: string, sessionId: string): Promise<{ revoked: boolean }> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    return { revoked: true };
  }

  /**
   * Revoke All Other Sessions
   */
  async revokeAllOtherSessions(
    userId: string,
    currentToken?: string,
  ): Promise<{ revokedCount: number }> {
    const currentHash = currentToken ? hashToken(currentToken) : null;

    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
        ...(currentHash ? { tokenHash: { not: currentHash } } : {}),
      },
      data: { isRevoked: true },
    });

    return { revokedCount: result.count };
  }
}
