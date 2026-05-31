import { Inject, Injectable } from '@nestjs/common';
import type { AuthUserLoader, AuthenticatedUser, JwtPayload } from '@stemverse/auth';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaAuthUserLoader implements AuthUserLoader {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async loadUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        organizationId: true,
      },
    });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      organizationId: user.organizationId,
    };
  }
}
