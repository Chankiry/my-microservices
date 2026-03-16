import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
    private readonly logger    = new Logger(RedisService.name);
    private readonly defaultTTL: number;

    constructor(
        @Inject('REDIS_CLIENT') private readonly redisClient: any,
        private readonly configService: ConfigService,
    ) {
        // Reads CACHE_TTL from env — falls back to 1800 s (30 min)
        this.defaultTTL = this.configService.get<number>('CACHE_TTL', 1800);
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.redisClient.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error: any) {
            this.logger.error(`Cache get error [${key}]: ${error.message}`);
            return null;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<boolean> {
        try {
            const effectiveTTL = ttl ?? this.defaultTTL;
            await this.redisClient.setex(key, effectiveTTL, JSON.stringify(value));
            return true;
        } catch (error: any) {
            this.logger.error(`Cache set error [${key}]: ${error.message}`);
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        try {
            await this.redisClient.del(key);
            return true;
        } catch (error: any) {
            this.logger.error(`Cache del error [${key}]: ${error.message}`);
            return false;
        }
    }

    async delPattern(pattern: string): Promise<number> {
        try {
            const keys: string[] = await this.redisClient.keys(pattern);
            if (keys.length === 0) return 0;
            await this.redisClient.del(...keys);
            return keys.length;
        } catch (error: any) {
            this.logger.error(`Cache delPattern error [${pattern}]: ${error.message}`);
            return 0;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            return (await this.redisClient.exists(key)) === 1;
        } catch {
            return false;
        }
    }

    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            await this.redisClient.expire(key, ttl);
            return true;
        } catch {
            return false;
        }
    }

    async healthCheck(): Promise<{ status: string; latency: number }> {
        try {
            const start = Date.now();
            await this.redisClient.ping();
            return { status: 'healthy', latency: Date.now() - start };
        } catch {
            return { status: 'unhealthy', latency: -1 };
        }
    }
}