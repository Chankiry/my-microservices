import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule }       from '@nestjs/config';
import { SequelizeModule }    from '@nestjs/sequelize';
import { AuthService }        from './service';
import { AuthController }     from './controller';
import { JwtStrategy }        from '@app/core/strategies/jwt.strategy';
import { CacheModule }        from '@app/infra/cache/cache.module';
import { UserModule }         from '@app/resources/r2-user/module';
import { KeycloakModule }     from '@app/communications/keycloak/keycloak.module';
import { SystemsModule }      from '../../r4-systems/module';
import UserSystemAccess       from '../../../../models/user/user-system-access.model';
import UserExternalLinks      from '../../../../models/user/user-external-links.model';
import { ProfileService }     from '../a2-profile/service';

@Module({
    imports  : [
        CacheModule,
        ConfigModule,
        UserModule,
        KeycloakModule,
        SystemsModule,
        SequelizeModule.forFeature([UserSystemAccess, UserExternalLinks]),
    ],
    controllers: [AuthController],
    providers  : [AuthService, ProfileService, JwtStrategy],
    exports    : [AuthService],
})
export class AuthModule {}