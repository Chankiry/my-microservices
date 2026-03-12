import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInvalidationListener {
    private readonly logger = new Logger(CacheInvalidationListener.name);

    constructor(private readonly redisService: RedisService) {}

    @OnEvent('user.updated')
    async handleUserUpdatedEvent(payload: { userId: string; email?: string }) {
        this.logger.log(`Received user.updated event for ${payload.userId}`);
        
        await this.redisService.del(`user:profile:${payload.userId}`);
        
        if (payload.email) {
        await this.redisService.delPattern(`user:email:*`);
        }
    }

    @OnEvent('user.deleted')
    async handleUserDeletedEvent(payload: { userId: string }) {
        this.logger.log(`Received user.deleted event for ${payload.userId}`);
        await this.redisService.delPattern(`user:*:${payload.userId}`);
    }

    @OnEvent('role.changed')
    async handleRoleChangedEvent(payload: { userId: string }) {
        this.logger.log(`Received role.changed event for ${payload.userId}`);
        await this.redisService.del(`user:roles:${payload.userId}`);
        await this.redisService.del(`user:profile:${payload.userId}`);
    }
}