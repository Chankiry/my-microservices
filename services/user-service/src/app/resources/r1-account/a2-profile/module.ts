import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ProfileController } from './controller';
import { ProfileService } from './service';
import User from '../../../models/user/user.model';
import { CacheModule } from '../../../cache/cache.module';
import { KafkaModule } from '../../../communications/kafka/kafka.module';

@Module({
    imports: [
        SequelizeModule.forFeature([User]),
        CacheModule,
        KafkaModule,
    ],
    controllers: [ProfileController],
    providers: [ProfileService],
    exports: [ProfileService],
})
export class ProfileModule {}
