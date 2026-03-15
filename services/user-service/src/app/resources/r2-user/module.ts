import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './controller';
import { UserService } from './service';
import User from '../../models/user/user.model';
import { KafkaModule } from '../../communications/kafka/kafka.module';
import { CacheModule } from '@app/infra/cache/cache.module';
import { KafkaProducerService } from '../../communications/kafka/kafka-producer.service';

@Module({
    imports: [
        SequelizeModule.forFeature([User]),
        KafkaModule,
        CacheModule,
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
