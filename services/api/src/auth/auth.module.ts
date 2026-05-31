import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StemverseAuthModule } from '@stemverse/auth';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuditService } from '../audit/audit.service';
import { PrismaAuthUserLoader } from './prisma-auth-user.loader';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    StemverseAuthModule.register({ userLoaderClass: PrismaAuthUserLoader }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuditService],
  exports: [AuthService, JwtModule, StemverseAuthModule],
})
export class AuthModule {}
