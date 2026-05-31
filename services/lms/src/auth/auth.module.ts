import { Module } from '@nestjs/common';
import { StemverseAuthModule } from '@stemverse/auth';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaAuthUserLoader } from './prisma-auth-user.loader';

@Module({
  imports: [
    PrismaModule,
    StemverseAuthModule.register({ userLoaderClass: PrismaAuthUserLoader }),
  ],
  providers: [PrismaAuthUserLoader],
  exports: [StemverseAuthModule],
})
export class AuthModule {}
