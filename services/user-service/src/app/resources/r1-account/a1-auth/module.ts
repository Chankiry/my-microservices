import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './service';
import { AuthController } from './controller';
import { JwtStrategy } from '@app/core/strategies/jwt.strategy';
import { CacheModule } from '@app/infra/cache/cache.module';
import { UserModule } from '@app/resources/r2-user/module';
import { KeycloakModule } from '@app/communications/keycloak/keycloak.module';

@Module({
    imports  : [
        CacheModule,
        ConfigModule,
        UserModule,
        KeycloakModule,
    ],
    controllers: [AuthController],
    providers  : [AuthService, JwtStrategy],
    exports    : [AuthService],
})
export class AuthModule {}