import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';


@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
        provide: 'REDIS_CLIENT',
        useFactory: (configService: ConfigService) => {
            const Redis = require('ioredis');
            return new Redis({
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get('REDIS_DB', 0),
            keyPrefix: configService.get('REDIS_PREFIX', 'ms:'),
            retryStrategy: (times: number) => {
                if (times > 10) {
                console.error('Redis connection failed after 10 retries');
                return null;
                }
                const delay = Math.min(times * 100, 3000);
                console.log(`Redis retry attempt ${times}, delay: ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            enableOfflineQueue: true,
            });
        },
        inject: [ConfigService],
        },
        RedisService,
    ],
    exports: [RedisService],
})
export class CacheModule {}