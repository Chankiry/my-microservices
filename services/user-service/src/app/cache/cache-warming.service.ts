// src/modules/cache/cache-warming.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RedisService } from './redis.service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
    private readonly logger = new Logger(CacheWarmingService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly redisService: RedisService,
    ) {}

    async onModuleInit() {
        // Warm cache with active users on startup
        await this.warmActiveUsersCache();
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
        } catch (error) {
        this.logger.error(`Cache warming failed: ${error.message}`);
        }
    }
}