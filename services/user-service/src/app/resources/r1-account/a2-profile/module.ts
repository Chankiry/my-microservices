import { Module }           from '@nestjs/common';
import { SequelizeModule }  from '@nestjs/sequelize';
import { ProfileController } from './controller';
import { ProfileService }    from './service';
import { UserModule }        from '../../r2-user/module';
import { KeycloakModule }    from '../../../communications/keycloak/keycloak.module';
import { AuthModule }        from '../a1-auth/module';
import { CacheModule }       from '@app/infra/cache/cache.module';
import { SystemsModule }     from '../../r4-systems/module';
import UserSystemAccess      from '../../../../models/user/user-system-access.model';
import UserExternalLinks     from '../../../../models/user/user-external-links.model';

@Module({
    imports: [
        SequelizeModule.forFeature([UserSystemAccess, UserExternalLinks]),
        UserModule,
        KeycloakModule,
        AuthModule,
        CacheModule,
        SystemsModule,  // provides SystemService for findById + findRoleNames
    ],
    controllers: [ProfileController],
    providers  : [ProfileService],
    exports    : [ProfileService],
})
export class ProfileModule {}