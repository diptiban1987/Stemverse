import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  AUTH_USER_LOADER,
  type AuthUserLoader,
  statelessAuthUserLoader,
} from './interfaces/auth-user-loader.interface';
import { JwtStrategy } from './strategies/jwt.strategy';

export interface StemverseAuthModuleOptions {
  userLoader?: AuthUserLoader;
  userLoaderClass?: Type<AuthUserLoader>;
}

@Module({})
export class StemverseAuthModule {
  static register(options: StemverseAuthModuleOptions = {}): DynamicModule {
    const loaderProviders: Provider[] = options.userLoaderClass
      ? [
          options.userLoaderClass,
          { provide: AUTH_USER_LOADER, useExisting: options.userLoaderClass },
        ]
      : [
          {
            provide: AUTH_USER_LOADER,
            useValue: options.userLoader ?? statelessAuthUserLoader,
          },
        ];

    return {
      module: StemverseAuthModule,
      global: true,
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
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
      providers: [...loaderProviders, JwtStrategy],
      exports: [PassportModule, JwtModule, AUTH_USER_LOADER, JwtStrategy],
    };
  }
}
