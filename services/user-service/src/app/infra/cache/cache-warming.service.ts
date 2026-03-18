import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { UserService } from '@app/resources/r2-user/service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
    private readonly logger  = new Logger(CacheWarmingService.name);
    private readonly CACHE_TTL: number;

    constructor(
        private readonly userService  : UserService,
        private readonly redisService : RedisService,
        private readonly configService: ConfigService,
    ) {
        this.CACHE_TTL = this.configService.get<number>('CACHE_TTL', 1800);
    }

    async onModuleInit(): Promise<void> {
        // Delay 5 s to let DB connection establish before querying
        setTimeout(() => {
            this.warmActiveUsersCache().catch(err => {
                this.logger.warn(`Initial cache warming failed: ${err.message}`);
            });
        }, 5000);
    }

    async warmActiveUsersCache(): Promise<void> {
        this.logger.log('Starting cache warming for active users...');
        try {
            const users = await this.userService.findActiveUsers(200);

            for (const user of users) {
                await this.redisService.set(`user:profile:${user.id}`,         user, this.CACHE_TTL);
                if (user.keycloak_id) await this.redisService.set(`user:keycloak:${user.keycloak_id}`, user, this.CACHE_TTL);
                if (user.phone)       await this.redisService.set(`user:phone:${user.phone}`,          user, this.CACHE_TTL);
                if (user.email)       await this.redisService.set(`user:email:${user.email}`,          user, this.CACHE_TTL);
            }

            this.logger.log(`Cache warming completed: ${users.length} users cached`);
        } catch (err: any) {
            this.logger.error(`Cache warming failed: ${err.message}`);
        }
    }
}