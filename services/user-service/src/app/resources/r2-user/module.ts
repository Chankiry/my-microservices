import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './controller';
import { UserService } from './service';
import User from '../../../models/user/user.model';
import { KafkaModule } from '../../communications/kafka/kafka.module';
import { KeycloakModule } from '../../communications/keycloak/keycloak.module';
import { CacheModule } from '@app/infra/cache/cache.module';
import { OutboxModule } from '@app/outbox/outbox.module';

@Module({
    imports: [
        SequelizeModule.forFeature([User])
        , KafkaModule
        , KeycloakModule
        , CacheModule
        , OutboxModule
    ],
    controllers: [UserController],
    providers:   [UserService],
    exports:     [UserService],
})
export class UserModule {}