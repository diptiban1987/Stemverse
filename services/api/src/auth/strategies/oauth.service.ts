import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  displayName?: string;
  avatar?: string;
}

/**
 * OAuth Service handles Google and GitHub OAuth login/registration.
 * Creates a new user on first OAuth login, or links to existing account by email.
 */
@Injectable()
export class OAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Validate an OAuth callback and return JWT tokens.
   * If user doesn't exist, create them with a random password hash.
   */
  async validateOAuthLogin(profile: OAuthProfile, ip?: string) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Auto-register OAuth users — no password needed
      const { randomBytes, createHash } = await import('crypto');
      const randomPwd = randomBytes(32).toString('hex');
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(randomPwd, 12);

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          passwordHash,
          displayName: profile.displayName || profile.email.split('@')[0],
          emailVerified: true, // OAuth emails are pre-verified
        },
      });

      await this.audit.log('oauth_register', user.id, ip, {
        provider: profile.provider,
        providerId: profile.providerId,
      });
    } else {
      await this.audit.log('oauth_login', user.id, ip, {
        provider: profile.provider,
      });
    }

    // Generate JWT tokens
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload);

    // Generate refresh token
    const { randomBytes, createHash } = await import('crypto');
    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn) || 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  /** Get the Google OAuth config */
  getGoogleConfig() {
    return {
      clientId: this.config.get('GOOGLE_CLIENT_ID', ''),
      redirectUri: this.config.get('GOOGLE_REDIRECT_URI', '/api/auth/google/callback'),
    };
  }

  /** Get the GitHub OAuth config */
  getGithubConfig() {
    return {
      clientId: this.config.get('GITHUB_CLIENT_ID', ''),
      redirectUri: this.config.get('GITHUB_REDIRECT_URI', '/api/auth/github/callback'),
    };
  }
}
