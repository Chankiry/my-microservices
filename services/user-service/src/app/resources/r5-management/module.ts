import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ManagementController } from './controller';
import { ManagementService } from './service';
import UserAppAccess from '../../../models/user/user-app-access.model';
import UserLoginLog  from '../../../models/user/user-login-log.model';
import { UserModule } from '../r2-user/module';
import { AppsModule } from '../r4-apps/module';
import { KeycloakModule } from '../../communications/keycloak/keycloak.module';

@Module({
    imports: [
        SequelizeModule.forFeature([UserAppAccess, UserLoginLog]),
        UserModule,
        AppsModule,
        KeycloakModule,
    ],
    controllers: [ManagementController],
    providers  : [ManagementService],
    exports    : [ManagementService],
})
export class ManagementModule {}