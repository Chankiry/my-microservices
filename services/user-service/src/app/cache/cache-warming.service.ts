import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserService } from '../resources/r2-user/service';
import { RedisService } from './redis.service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
    private readonly logger = new Logger(CacheWarmingService.name);

    constructor(
        private readonly usersService: UserService,
        private readonly redisService: RedisService,
    ) {}

    async onModuleInit() {
        // Delay cache warming to allow database connection to establish
        setTimeout(() => {
            this.warmActiveUsersCache().catch(err => {
                this.logger.warn(`Initial cache warming failed: ${err.message}`);
            });
        }, 5000);
    }

    async warmActiveUsersCache(): Promise<void> {
        this.logger.log('Starting cache warming for active users...');

        try {
            const activeUsers = await this.usersService.findActiveUsers(100);

            for (const user of activeUsers) {
                await this.redisService.set(
                    `user:profile:${user.id}`,
                    user,
                    1800,
                );
            }

            this.logger.log(`Cache warming completed: ${activeUsers.length} users cached`);
        } catch (error: any) {
            this.logger.error(`Cache warming failed: ${error.message}`);
        }
    }
}
