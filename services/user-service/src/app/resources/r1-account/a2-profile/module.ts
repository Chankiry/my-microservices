import { Module } from '@nestjs/common';
import { ProfileController } from './controller';
import { ProfileService } from './service';
import { UserModule } from '../../r2-user/module';
import { KeycloakModule } from '../../../communications/keycloak/keycloak.module';
import { AuthModule } from '../a1-auth/module';
import { CacheModule } from '@app/infra/cache/cache.module';

@Module({
    imports: [
        UserModule,      // provides UserService
        KeycloakModule,  // provides KeycloakAdminService
        AuthModule,      // provides AuthService (token blacklist)
        CacheModule,     // provides RedisService (session cleanup)
    ],
    controllers: [ProfileController],
    providers:   [ProfileService],
    exports:     [ProfileService],
})
export class ProfileModule {}