import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoginRequest, RegisterRequest, LoginResponse } from '@aeo-nexus/contracts';
import { signJwtHmacSha256 } from '@aeo-nexus/auth';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be configured with at least 32 characters of secret material.',
      );
    }
    return secret;
  }

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const secret = this.getJwtSecret();
    const token = signJwtHmacSha256(
      {
        sub: user.id,
        email: user.email,
        platformRole: user.platformRole,
        exp: Math.floor(Date.now() / 1000) + 86400,
      },
      secret,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        platformRole: user.platformRole,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken: token,
        expiresIn: 86400,
      },
      activeWorkspaces: user.memberships.map((m) => ({
        id: m.workspaceId,
        name: m.workspace.name,
        role: m.role,
      })),
    };
  }

  async register(dto: RegisterRequest): Promise<LoginResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    return this.login({ email: dto.email, password: dto.password });
  }
}
