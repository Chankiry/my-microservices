import { Module } from '@nestjs/common';
import { PublicController } from './controller';
import { PublicService } from './service';
import { CacheModule } from '@app/infra/cache/cache.module';
import { KafkaModule } from '../../communications/kafka/kafka.module';

@Module({
    imports: [CacheModule, KafkaModule],
    controllers: [PublicController],
    providers: [PublicService],
    exports: [PublicService],
})
export class PublicModule {}
