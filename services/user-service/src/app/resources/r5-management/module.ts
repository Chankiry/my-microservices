import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ManagementController } from './controller';
import { ManagementService } from './service';
import UserSystemAccess from '../../../models/user/user-system-access.model';
import UserLoginLog     from '../../../models/user/user-login-log.model';
import SystemRole       from '../../../models/system/system-role.model';
import { UserModule } from '../r2-user/module';
import { SystemsModule } from '../r4-systems/module';
import { KeycloakModule } from '../../communications/keycloak/keycloak.module';

@Module({
    imports: [
        SequelizeModule.forFeature([UserSystemAccess, UserLoginLog, SystemRole]),
        UserModule,
        SystemsModule,
        KeycloakModule,
    ],
    controllers: [ManagementController],
    providers  : [ManagementService],
    exports    : [ManagementService],
})
export class ManagementModule {}