import { Injectable, Inject, Logger } from '@nestjs/common';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly defaultTTL = 3600; // 1 hour default TTL

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: any) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        this.logger.debug(`Cache miss for key: ${key}`);
        return null;
      }
      this.logger.debug(`Cache hit for key: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Error getting key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
      this.logger.debug(`Set cache key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      this.logger.error(`Error setting key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete a single key
   */
  async del(key: string): Promise<boolean> {
    try {
      await this.redisClient.del(key);
      this.logger.debug(`Deleted cache key: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redisClient.del(...keys);
      this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await this.redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      this.logger.error(`Error setting TTL for ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    try {
      const start = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      return { status: 'unhealthy', latency: -1 };
    }
  }
}