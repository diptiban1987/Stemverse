import { Injectable } from '@nestjs/common';
import type { AuthUserLoader, AuthenticatedUser, JwtPayload } from '@stemverse/auth';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaAuthUserLoader implements AuthUserLoader {
  constructor(private readonly prisma: PrismaService) {}

  async loadUser(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, displayName: true },
    });
    if (!user) {
      return null;
    }
    return user;
  }
}
