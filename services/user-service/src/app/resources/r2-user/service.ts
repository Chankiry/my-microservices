import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize, literal } from 'sequelize';
import { CreateUserDto, UpdateUserDto } from './dto';
import { KafkaProducerService } from '../../communications/kafka/kafka-producer.service';
import { RedisService } from '@app/infra/cache/redis.service';
import User from '../../../models/user/user.model';
import { KeycloakAdminService } from '@app/communications/keycloak/keycloak-admin.service';
import { OutboxService } from '@app/outbox/outbox.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    private readonly CACHE_TTL: number;

    constructor(
        @InjectModel(User)
        private readonly userModel      : typeof User,
        private readonly kafkaProducer  : KafkaProducerService,
        private readonly keycloakAdmin  : KeycloakAdminService,
        private readonly outboxService  : OutboxService,
        private readonly redisService   : RedisService,
        @InjectConnection()
        private readonly sequelize      : Sequelize,
        private readonly configService  : ConfigService,
    ) {
        this.CACHE_TTL = this.configService.get<number>('CACHE_TTL', 1800);
    }

    // ─────────────────────────────────────────
    //  Read methods
    // ─────────────────────────────────────────

    async findById(id: string): Promise<User> {
        const cacheKey = `user:profile:${id}`;

        const cachedUser = await this.redisService.get<User>(cacheKey);
        if (cachedUser) {
            return cachedUser;
        }

        const user = await this.userModel.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        await this.redisService.set(cacheKey, user, this.CACHE_TTL);
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const cacheKey = `user:email:${email}`;

        const cachedId = await this.redisService.get<string>(cacheKey);
        if (cachedId) {
            return this.findById(cachedId);
        }

        const user = await this.userModel.findOne({ where: { email } });
        if (!user) return null;

        await Promise.all([
            this.redisService.set(cacheKey, user.id, this.CACHE_TTL),
            this.redisService.set(`user:profile:${user.id}`, user, this.CACHE_TTL),
        ]);

        return user;
    }

    async findByUsername(username: string): Promise<User | null> {
        const cacheKey = `user:username:${username}`;

        const cachedId = await this.redisService.get<string>(cacheKey);
        if (cachedId) {
            return this.findById(cachedId);
        }

        const user = await this.userModel.findOne({ where: { username } });
        if (!user) return null;

        await Promise.all([
            this.redisService.set(cacheKey, user.id, this.CACHE_TTL),
            this.redisService.set(`user:profile:${user.id}`, user, this.CACHE_TTL),
        ]);

        return user;
    }

    async findByKeycloakId(keycloakId: string): Promise<User | null> {
        const cacheKey = `user:keycloak:${keycloakId}`;

        const cachedId = await this.redisService.get<string>(cacheKey);
        if (cachedId) {
            return this.findById(cachedId);
        }

        const user = await this.userModel.findOne({ where: { keycloakId } });
        if (!user) return null;

        await Promise.all([
            this.redisService.set(cacheKey, user.id, this.CACHE_TTL),
            this.redisService.set(`user:profile:${user.id}`, user, this.CACHE_TTL),
        ]);

        return user;
    }

    async findAll(query: {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
    }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
        const page  = query.page  || 1;
        const limit = query.limit || 10;
        const offset = (page - 1) * limit;

        const whereClause: any = {};

        if (query.search) {
            whereClause[Op.or] = [
                { username:  { [Op.iLike]: `%${query.search}%` } },
                { email:     { [Op.iLike]: `%${query.search}%` } },
                { firstName: { [Op.iLike]: `%${query.search}%` } },
                { lastName:  { [Op.iLike]: `%${query.search}%` } },
            ];
        }

        if (query.isActive !== undefined) {
            whereClause.isActive = query.isActive;
        }

        const { count, rows } = await this.userModel.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [literal('"created_at" DESC')],
        });

        return { data: rows, total: count, page, limit };
    }

    async findActiveUsers(limit = 100): Promise<User[]> {
        return this.userModel.findAll({
            where: { isActive: true },
            limit,
            order: [literal('"last_login_at" DESC NULLS LAST')],
        });
    }

    async findAllWithoutKeycloakId(): Promise<User[]> {
        return this.userModel.findAll({
            where: { keycloakId: null },
        });
    }

    async getUserRoles(userId: string): Promise<string[]> {
        const cacheKey = `user:roles:${userId}`;

        const cachedRoles = await this.redisService.get<string[]>(cacheKey);
        if (cachedRoles) return cachedRoles;

        const user = await this.findById(userId);
        const roles = user.roles || [];

        await this.redisService.set(cacheKey, roles, this.CACHE_TTL);
        return roles;
    }

    // ─────────────────────────────────────────
    //  Write methods
    // ─────────────────────────────────────────

    async create(createUserDto: CreateUserDto): Promise<User> {
        const transaction = await this.sequelize.transaction();
        try {
            const user = await this.userModel.create(
                createUserDto as any,
                { transaction },
            );

            await this.outboxService.saveToOutbox(
                transaction,
                'USER_CREATED',
                'user',
                user.id,
                {
                    userId:    user.id,
                    email:     user.email,
                    username:  user.username,
                    firstName: user.firstName,
                    lastName:  user.lastName,
                    roles:     user.roles || [],
                },
            );

            await transaction.commit();
            this.logger.log(`User created: ${user.id}`);
            return user;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const transaction = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({
                where: { id },
                transaction,
            });
            if (!user) throw new NotFoundException(`User with ID ${id} not found`);

            const changes = this.getChanges(user, updateUserDto);
            Object.assign(user, updateUserDto);
            await user.save({ transaction });

            if (Object.keys(changes).length > 0) {
                await this.outboxService.saveToOutbox(
                    transaction,
                    'USER_UPDATED',
                    'user',
                    id,
                    { changes },
                );
            }

            await transaction.commit();

            await this.invalidateUserCache(id, user);
            this.logger.log(`User updated: ${id}`);
            return user;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async updateStatus(id: string, isActive: boolean): Promise<User> {
        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User with ID ${id} not found`);

        // Call Keycloak first — if Keycloak rejects, DB stays unchanged.
        // user-service and Keycloak must stay in sync on isActive/enabled.
        if (user.keycloakId) {
            await this.keycloakAdmin.setEnabled(user.keycloakId, isActive);
        }

        user.isActive = isActive;
        await user.save();

        await this.invalidateUserCache(id, user);
        await this.kafkaProducer.emitUserUpdated(id, { isActive });

        this.logger.log(`User ${id} status set to isActive=${isActive}`);
        return user;
    }

    async updateKeycloakId(userId: string, keycloakId: string): Promise<User> {
        const user = await this.userModel.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

        user.keycloakId = keycloakId;
        await user.save();

        await this.invalidateUserCache(userId, user);
        this.logger.log(`User ${userId} linked to keycloakId ${keycloakId}`);
        return user;
    }

    async updateLastLogin(userId: string): Promise<void> {
        await this.userModel.update(
            { lastLoginAt: new Date() },
            { where: { id: userId } },
        );
        await this.redisService.del(`user:profile:${userId}`);
    }


    // Updates only the JSONB profile column — business/personal data.
    // Does NOT touch identity mirror columns (email, firstName, lastName etc.)
    // and does NOT emit a Kafka event because this change is user-service internal.
    async updateBusinessProfile(
        id: string,
        fields: Partial<{
            avatar: string;
            phone : string;
            gender: string;
        }>,
    ): Promise<User> {
        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User with ID ${id} not found`);

        user.profile = { ...(user.profile || {}), ...fields };
        await user.save();

        await this.redisService.del(`user:profile:${id}`);
        this.logger.log(`Business profile updated for user ${id}`);
        return user;
    }

    async remove(id: string): Promise<void> {
        const transaction = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({
                where: { id },
                transaction,
            });
            if (!user) throw new NotFoundException(`User with ID ${id} not found`);

            await this.outboxService.saveToOutbox(
                transaction,
                'USER_DELETED',
                'user',
                id,
                { userId: id, deletedAt: new Date().toISOString() },
            );

            // paranoid: true — sets deleted_at, does NOT hard-delete
            await user.destroy({ transaction });

            await transaction.commit();

            await this.invalidateUserCache(id, user);
            this.logger.log(`User soft-deleted: ${id}`);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Update identity mirror columns that come from Keycloak events.
     * Does NOT emit a Kafka event — the change originated from Keycloak,
     * re-broadcasting would be noise for downstream consumers.
     */
    async updateMirrorFields(id: string, fields: Partial<Pick<User,
        'email' | 'firstName' | 'lastName' | 'isActive' | 'emailVerified'
    >>): Promise<void> {
        await this.userModel.update(fields, { where: { id } });
        await this.redisService.del(`user:profile:${id}`);
        this.logger.log(`Mirror fields updated for user ${id}`);
    }

    // ─────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────

    private getChanges(user: User, dto: UpdateUserDto): Record<string, any> {
        const changes: Record<string, any> = {};

        if (dto.firstName !== undefined && user.firstName !== dto.firstName)
            changes.firstName = { old: user.firstName, new: dto.firstName };

        if (dto.lastName !== undefined && user.lastName !== dto.lastName)
            changes.lastName = { old: user.lastName, new: dto.lastName };

        if (dto.email !== undefined && user.email !== dto.email)
            changes.email = { old: user.email, new: dto.email };

        if (dto.isActive !== undefined && user.isActive !== dto.isActive)
            changes.isActive = { old: user.isActive, new: dto.isActive };

        return changes;
    }

    private async invalidateUserCache(userId: string, user: User): Promise<void> {
        await Promise.all([
            this.redisService.del(`user:profile:${userId}`),
            this.redisService.del(`user:email:${user.email}`),
            this.redisService.del(`user:username:${user.username}`),
            this.redisService.del(`user:roles:${userId}`),
            this.redisService.del(`user:keycloak:${user.keycloakId}`),
            this.redisService.del(`user:settings:${userId}`),
        ]);
    }
}