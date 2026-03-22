import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SystemController } from './controller';
import { SystemService } from './service';
import System     from '../../../models/system/system.model';
import SystemRole from '../../../models/system/system-role.model';
import { KeycloakModule } from '../../communications/keycloak/keycloak.module';
import { UserModule } from '../r2-user/module';

@Module({
    imports    : [
        SequelizeModule.forFeature([System, SystemRole])
        , KeycloakModule
        , UserModule
    ],
    controllers: [SystemController],
    providers  : [SystemService],
    exports    : [SystemService],
})
export class SystemsModule {}