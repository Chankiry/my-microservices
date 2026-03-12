import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from 'src/app/cache/redis.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { KafkaProducerService } from 'src/app/communications/kafka/kafka-producer.service';
import User from 'src/app/models/user/user.model';

@Injectable()
export class UsersService {

    private readonly CACHE_TTL = 1800;
    constructor(
        private readonly kafkaProducer: KafkaProducerService,
        private readonly redisService: RedisService,
    ) {}

    /**
     * Find user by ID with cache-aside pattern
     */
    async findById(id: string): Promise<User> {
        const cacheKey = `user:profile:${id}`;
        
        // Step 1: Check cache
        const cachedUser = await this.redisService.get<User>(cacheKey);
        if (cachedUser) {
        return cachedUser;
        }

        // Step 2: Query database on cache miss
        const user = await User.findOne({ where: { id } });
        if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Step 3: Store in cache
        await this.redisService.set(cacheKey, user, this.CACHE_TTL);

        return user;
    }

    /**
     * Find user by email with caching
     */
    async findByEmail(email: string): Promise<any | null> {
        const cacheKey = `user:email:${email}`;
        
        // Check if we have cached user ID
        const cachedId = await this.redisService.get<string>(cacheKey);
        if (cachedId) {
        return this.findById(cachedId); // This will use profile cache
        }

        // Query database
        const user = await User.findOne({ where: { email } });
        if (!user) {
        return null;
        }

        // Cache the email-to-id mapping
        await this.redisService.set(cacheKey, user.id, this.CACHE_TTL);
        
        // Cache the profile
        await this.redisService.set(`user:profile:${user.id}`, user, this.CACHE_TTL);

        return user;
    }

    /**
     * Get cached user roles
     */
    async getUserRoles(userId: string): Promise<string[]> {
        const cacheKey = `user:roles:${userId}`;
        
        const cachedRoles = await this.redisService.get<string[]>(cacheKey);
        if (cachedRoles) {
        return cachedRoles;
        }

        const user = await this.findById(userId);
        const roles = user.roles || [];
        
        await this.redisService.set(cacheKey, roles, this.CACHE_TTL);
        
        return roles;
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        // Create user in database
        const user = User.create(createUserDto);
        await user.save();

        // Emit event after successful database commit
        await this.kafkaProducer.emitUserCreated(user);

        return user;
    }

    /**
     * Update user and invalidate cache
     */
    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        // Update database
        const user = await this.findById(id);
        const changes = this.getChanges(user, updateUserDto);
        Object.assign(user, updateUserDto);
        await user.save();

        // Invalidate all related cache entries
        await this.invalidateUserCache(id, user);

        // Emit update event
        await this.kafkaProducer.emitUserUpdated(id, changes);

        return user;
    }

    /**
     * Delete user and invalidate cache
     */
    async remove(id: string): Promise<void> {
        const user = await this.findById(id);
        await user.destroy();
        
        // Invalidate cache
        await this.invalidateUserCache(id, user);
    }

    /**
     * Invalidate all cache entries for a user
     */
    private async invalidateUserCache(userId: string, user: User): Promise<void> {
        const keysToDelete = [
            `user:profile:${userId}`,
            `user:email:${user.email}`,
            `user:username:${user.username}`,
            `user:roles:${userId}`,
            `user:settings:${userId}`,
        ];

        // Delete all keys in a single operation
        for (const key of keysToDelete) {
            await this.redisService.del(key);
        }

        // this.logger.log(`Invalidated cache for user ${userId}`);
    }
}