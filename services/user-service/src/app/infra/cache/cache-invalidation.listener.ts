import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInvalidationListener {
    private readonly logger = new Logger(CacheInvalidationListener.name);

    constructor(private readonly redisService: RedisService) {}

    @OnEvent('user.updated')
    async handleUserUpdated(payload: { user_id: string; email?: string; phone?: string }) {
        this.logger.log(`Cache invalidation for user.updated: ${payload.user_id}`);

        await this.redisService.del(`user:profile:${payload.user_id}`);

        if (payload.email) await this.redisService.del(`user:email:${payload.email}`);
        if (payload.phone) await this.redisService.del(`user:phone:${payload.phone}`);
    }

    @OnEvent('user.deleted')
    async handleUserDeleted(payload: { user_id: string }) {
        this.logger.log(`Cache invalidation for user.deleted: ${payload.user_id}`);
        await this.redisService.delPattern(`user:*:${payload.user_id}`);
    }
}