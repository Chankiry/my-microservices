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
                    host     : configService.get<string>('REDIS_HOST',     'localhost'),
                    port     : configService.get<number>('REDIS_PORT',     6379),
                    password : configService.get<string>('REDIS_PASSWORD', ''),
                    db       : configService.get<number>('REDIS_DB',       0),
                    keyPrefix: configService.get<string>('REDIS_PREFIX',   'user:ms:'),
                    retryStrategy: (times: number) => {
                        if (times > 10) return null;
                        return Math.min(times * 100, 3000);
                    },
                    maxRetriesPerRequest: 3,
                    enableReadyCheck    : true,
                    enableOfflineQueue  : true,
                });
            },
            inject: [ConfigService],
        },
        RedisService,
    ],
    exports: [RedisService],
})
export class CacheModule {}