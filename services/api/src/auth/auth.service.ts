import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { JwtPayload } from '@stemverse/auth';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type { JwtPayload };

@Injectable()
export class AuthService {
  private readonly refreshExpiresDays: number;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {
    const refreshExp = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    this.refreshExpiresDays = refreshExp.endsWith('d')
      ? parseInt(refreshExp, 10)
      : 7;
  }

  async register(dto: RegisterDto, ip?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName ?? dto.email.split('@')[0],
        role: UserRole.STUDENT,
      },
    });

    await this.audit.log({
      userId: user.id,
      action: 'auth.register',
      resource: 'user',
      resourceId: user.id,
      ipAddress: ip,
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.audit.log({
      userId: user.id,
      action: 'auth.login',
      resource: 'user',
      resourceId: user.id,
      ipAddress: ip,
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string, ip?: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({
      userId: stored.userId,
      action: 'auth.refresh',
      resource: 'user',
      resourceId: stored.userId,
      ipAddress: ip,
    });

    return this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<AuthTokens & { user: { id: string; email: string; role: UserRole; displayName: string | null } }> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.jwt.sign(payload);

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresDays);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, role: true, displayName: true },
    });

    return { accessToken, refreshToken, user };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
