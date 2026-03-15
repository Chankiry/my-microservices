import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ProfileController } from './controller';
import { ProfileService } from './service';
import User from '../../../models/user/user.model';
import { KafkaModule } from '../../../communications/kafka/kafka.module';
import { CacheModule } from '@app/infra/cache/cache.module';

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
