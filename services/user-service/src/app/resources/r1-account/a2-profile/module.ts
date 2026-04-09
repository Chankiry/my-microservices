import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ProfileController } from './controller';
import { ProfileService } from './service';
import { UserModule } from '../../r2-user/module';
import { KeycloakModule } from '../../../communications/keycloak/keycloak.module';
import { AuthModule } from '../a1-auth/module';        // your auth module
import { CacheModule } from '@app/infra/cache/cache.module';
import { SystemsModule } from '../../r4-systems/module';

import UserSystemAccess from '../../../../models/user/user-system-access.model';
import UserExternalLinks from '../../../../models/user/user-external-links.model';
import UserSystemRole from '../../../../models/user/user-system-role.model';
import SystemRole from '@models/system/system-role.model';
import System from '@models/system/system.model';

@Module({
    imports: [
        SequelizeModule.forFeature([UserSystemAccess, UserExternalLinks, UserSystemRole, SystemRole, System]),
        UserModule,
        KeycloakModule,
        forwardRef(() => AuthModule),   // ← MUST be forwardRef
        CacheModule,
        SystemsModule,
    ],
    controllers: [ProfileController],
    providers: [ProfileService],
    exports: [ProfileService],
})
export class ProfileModule {}