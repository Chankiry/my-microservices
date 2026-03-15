import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Op } from 'sequelize';
import { KafkaProducerService } from '../../communications/kafka/kafka-producer.service';
import { RedisService } from '@app/infra/cache/redis.service';
import User from '../../models/user/user.model';

@Injectable()
export class UserService {
    private readonly logger = console;
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
    async findByEmail(email: string): Promise<User | null> {
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
     * Find user by username with caching
     */
    async findByUsername(username: string): Promise<User | null> {
        const cacheKey = `user:username:${username}`;

        // Check if we have cached user ID
        const cachedId = await this.redisService.get<string>(cacheKey);
        if (cachedId) {
            return this.findById(cachedId);
        }

        // Query database
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return null;
        }

        // Cache the username-to-id mapping
        await this.redisService.set(cacheKey, user.id, this.CACHE_TTL);

        // Cache the profile
        await this.redisService.set(`user:profile:${user.id}`, user, this.CACHE_TTL);

        return user;
    }

    /**
     * Find user by Keycloak ID
     */
    async findByKeycloakId(keycloakId: string): Promise<User | null> {
        const cacheKey = `user:keycloak:${keycloakId}`;

        const cachedId = await this.redisService.get<string>(cacheKey);
        if (cachedId) {
            return this.findById(cachedId);
        }

        const user = await User.findOne({ where: { keycloakId } });
        if (!user) {
            return null;
        }

        await this.redisService.set(cacheKey, user.id, this.CACHE_TTL);
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

    /**
     * Find all users with pagination and filtering
     */
    async findAll(query: {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
    }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
        const page = query.page || 1;
        const limit = query.limit || 10;
        const offset = (page - 1) * limit;

        const whereClause: any = {};

        if (query.search) {
            whereClause[Op.or] = [
                { username: { [Op.iLike]: `%${query.search}%` } },
                { email: { [Op.iLike]: `%${query.search}%` } },
                { firstName: { [Op.iLike]: `%${query.search}%` } },
                { lastName: { [Op.iLike]: `%${query.search}%` } },
            ];
        }

        if (query.isActive !== undefined) {
            whereClause.isActive = query.isActive;
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return {
            data: rows,
            total: count,
            page,
            limit,
        };
    }

    /**
     * Find active users (for cache warming)
     */
    async findActiveUsers(limit: number = 100): Promise<User[]> {
        return User.findAll({
            where: { isActive: true },
            limit,
            order: [['last_login_at', 'DESC NULLS LAST']],
        });
    }

    /**
     * Find all users without Keycloak ID
     */
    async findAllWithoutKeycloakId(): Promise<User[]> {
        return User.findAll({
            where: {
                keycloakId: null,
            },
        });
    }

    /**
     * Create a new user
     */
    async create(createUserDto: CreateUserDto): Promise<User> {
        // Create user in database
        const user = User.build(createUserDto as any);
        await user.save();

        // Emit event after successful database commit
        await this.kafkaProducer.emitUserCreated(user);

        return user;
    }

    /**
     * Update user and invalidate cache
     */
    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        // ✅ Always fetch a fresh Sequelize instance from DB for updates
        // Never rely on cached object — cache returns plain JSON, not model instance
        const user = await User.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const changes = this.getChanges(user, updateUserDto);
        Object.assign(user, updateUserDto);

        // ✅ user is guaranteed to be a Sequelize instance here
        await user.save();

        // Invalidate cache AFTER successful save
        await this.invalidateUserCache(id, user);

        // Emit Kafka event
        await this.kafkaProducer.emitUserUpdated(id, changes);

        return user;
    }

    /**
     * Update user status (activate/deactivate)
     */
    async updateStatus(id: string, isActive: boolean): Promise<User> {
        const user = await this.findById(id);
        user.isActive = isActive;
        await user.save();

        await this.invalidateUserCache(id, user);

        await this.kafkaProducer.emitUserUpdated(id, { isActive });

        return user;
    }

    /**
     * Update Keycloak ID for a user
     */
    async updateKeycloakId(userId: string, keycloakId: string): Promise<User> {
        const user = await this.findById(userId);
        user.keycloakId = keycloakId;
        await user.save();

        await this.invalidateUserCache(userId, user);

        return user;
    }

    /**
     * Delete user and invalidate cache
     */
    async remove(id: string): Promise<void> {
        const user = await this.findById(id);
        await user.destroy();

        // Emit deletion event
        await this.kafkaProducer.emitUserDeleted(id);

        // Invalidate cache
        await this.invalidateUserCache(id, user);
    }

    /**
     * Get changes between user and DTO
     */
    private getChanges(user: User, dto: UpdateUserDto): Record<string, any> {
        const changes: Record<string, any> = {};

        if (dto.firstName !== undefined && user.firstName !== dto.firstName) {
            changes.firstName = { old: user.firstName, new: dto.firstName };
        }
        if (dto.lastName !== undefined && user.lastName !== dto.lastName) {
            changes.lastName = { old: user.lastName, new: dto.lastName };
        }
        if (dto.email !== undefined && user.email !== dto.email) {
            changes.email = { old: user.email, new: dto.email };
        }
        if (dto.isActive !== undefined && user.isActive !== dto.isActive) {
            changes.isActive = { old: user.isActive, new: dto.isActive };
        }

        return changes;
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
    }
}