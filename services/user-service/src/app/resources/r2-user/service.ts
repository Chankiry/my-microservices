import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Op, literal, Sequelize } from 'sequelize';
import { CreateUserDto, UpdateUserDto } from './dto';
import { KafkaProducerService } from '../../communications/kafka/kafka-producer.service';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { OutboxService } from '../../outbox/outbox.service';
import { RedisService } from '@app/infra/cache/redis.service';
import User from '../../../models/user/user.model';

@Injectable()
export class UserService {
    private readonly logger    = new Logger(UserService.name);
    private readonly CACHE_TTL : number;

    constructor(
        @InjectModel(User)
        private readonly userModel     : typeof User,
        private readonly kafkaProducer : KafkaProducerService,
        private readonly keycloakAdmin : KeycloakAdminService,
        private readonly outboxService : OutboxService,
        private readonly redisService  : RedisService,
        @InjectConnection()
        private readonly sequelize     : Sequelize,
        private readonly configService : ConfigService,
    ) {
        this.CACHE_TTL = this.configService.get<number>('CACHE_TTL', 1800);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    async findById(id: string): Promise<User> {
        const cached = await this.redisService.get<any>(`user:profile:${id}`);
        if (cached) {
            // Cache hit — re-fetch to return a proper Sequelize instance
            const user = await this.userModel.findOne({ where: { id } });
            if (!user) throw new NotFoundException(`User ${id} not found`);
            return user;
        }

        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        await this.redisService.set(`user:profile:${id}`, user.toJSON(), this.CACHE_TTL);
        return user;
    }

    async findByKeycloakId(keycloak_id: string): Promise<User | null> {
        const cached = await this.redisService.get<any>(`user:keycloak:${keycloak_id}`);
        if (cached) {
            // Cache hit — re-fetch to return a proper Sequelize instance
            return this.userModel.findOne({ where: { keycloak_id } });
        }

        const user = await this.userModel.findOne({ where: { keycloak_id } });
        if (user) await this.redisService.set(`user:keycloak:${keycloak_id}`, user.toJSON(), this.CACHE_TTL);
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const cached = await this.redisService.get<any>(`user:email:${email}`);
        if (cached) {
            return this.userModel.findOne({ where: { email } });
        }

        const user = await this.userModel.findOne({ where: { email } });
        if (user) await this.redisService.set(`user:email:${email}`, user.toJSON(), this.CACHE_TTL);
        return user;
    }

    async findByPhone(phone: string): Promise<User | null> {
        const cached = await this.redisService.get<any>(`user:phone:${phone}`);
        if (cached) {
            return this.userModel.findOne({ where: { phone } });
        }

        const user = await this.userModel.findOne({ where: { phone } });
        if (user) await this.redisService.set(`user:phone:${phone}`, user.toJSON(), this.CACHE_TTL);
        return user;
    }

    async findAll(query: {
        page?     : number;
        limit?    : number;
        search?   : string;
        is_active?: boolean;
    }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
        const page   = query.page  || 1;
        const limit  = query.limit || 10;
        const offset = (page - 1) * limit;
        const where: any = {};

        if (query.search) {
            where[Op.or] = [
                { phone      : { [Op.iLike]: `%${query.search}%` } },
                { email      : { [Op.iLike]: `%${query.search}%` } },
                { first_name : { [Op.iLike]: `%${query.search}%` } },
                { last_name  : { [Op.iLike]: `%${query.search}%` } },
            ];
        }

        if (query.is_active !== undefined) where.is_active = query.is_active;

        const { count, rows } = await this.userModel.findAndCountAll({
            where,
            limit,
            offset,
            order: [literal('"created_at" DESC')],
        });

        return { data: rows, total: count, page, limit };
    }

    async findActiveUsers(limit = 100): Promise<User[]> {
        return this.userModel.findAll({
            where : { is_active: true },
            limit,
            order : [literal('"last_login_at" DESC NULLS LAST')],
        });
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    async create(dto: CreateUserDto): Promise<User> {
        const tx = await this.sequelize.transaction();
        try {
            let keycloak_id = dto.keycloak_id || null;

            if (!keycloak_id) {
                try {
                    keycloak_id = await this.keycloakAdmin.createUser({
                        username   : dto.phone,
                        email      : dto.email || undefined,
                        first_name : dto.first_name,
                        last_name  : dto.last_name,
                        is_active  : dto.is_active ?? true,
                    });
                    this.logger.log(`Keycloak user created: ${keycloak_id}`);
                } catch (err: any) {
                    this.logger.warn(`Keycloak create failed, proceeding without keycloak_id: ${err.message}`);
                }
            }

            const user = await this.userModel.create({
                ...dto,
                keycloak_id,
                creator_id: dto.creator_id || null,
            } as any, { transaction: tx });

            await this.outboxService.saveToOutbox(tx, 'USER_CREATED', 'user', user.id, {
                user_id    : user.id,
                phone      : user.phone,
                email      : user.email,
                first_name : user.first_name,
                last_name  : user.last_name,
            });

            await tx.commit();
            this.logger.log(`User created: ${user.id} keycloak_id: ${keycloak_id}`);
            return user;
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    async update(id: string, dto: UpdateUserDto, updater_id?: string): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(`User ${id} not found`);

            const changes = this.getChanges(user, dto);
            Object.assign(user, dto);
            if (updater_id) user.updater_id = updater_id;
            await user.save({ transaction: tx });

            if (Object.keys(changes).length > 0) {
                await this.outboxService.saveToOutbox(tx, 'USER_UPDATED', 'user', id, { changes });
            }

            await tx.commit();
            await this.invalidateUserCache(id, user);
            this.logger.log(`User updated: ${id}`);
            return { data: user };
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    async remove(id: string, deleter_id?: string): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(`User ${id} not found`);

            await this.outboxService.saveToOutbox(tx, 'USER_DELETED', 'user', id, {
                user_id    : id,
                deleted_at : new Date().toISOString(),
            });

            if (deleter_id) {
                user.deleter_id = deleter_id;
                await user.save({ transaction: tx });
            }
            await user.destroy({ transaction: tx });

            await tx.commit();
            await this.invalidateUserCache(id, user);
            this.logger.log(`User soft-deleted: ${id}`);
            return { success: true };
        } catch (err) {
            await tx.rollback();
            throw err;
        }
    }

    // ─── Targeted updates ─────────────────────────────────────────────────────

    async updateStatus(id: string, is_active: boolean, updater_id?: string): Promise<User> {
        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        if (user.keycloak_id) {
            await this.keycloakAdmin.setEnabled(user.keycloak_id, is_active);
        }

        user.is_active = is_active;
        if (updater_id) user.updater_id = updater_id;
        await user.save();

        await this.invalidateUserCache(id, user);
        this.logger.log(`User ${id} is_active=${is_active}`);
        return user;
    }

    async updateKeycloakId(id: string, keycloak_id: string): Promise<User> {
        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        user.keycloak_id = keycloak_id;
        await user.save();

        await this.invalidateUserCache(id, user);
        return user;
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.userModel.update({ last_login_at: new Date() }, { where: { id } });
        await this.redisService.del(`user:profile:${id}`);
    }

    async updatePhone(id: string, phone: string): Promise<void> {
        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        const old_phone = user.phone;
        await this.userModel.update({ phone }, { where: { id } });

        await this.redisService.del(`user:phone:${old_phone}`);
        await this.redisService.del(`user:phone:${phone}`);
        await this.redisService.del(`user:profile:${id}`);
    }

    async updateMirrorFields(id: string, fields: Partial<Pick<User,
        'email' | 'first_name' | 'last_name' | 'is_active' | 'email_verified'
    >>): Promise<void> {
        await this.userModel.update(fields, { where: { id } });
        await this.redisService.del(`user:profile:${id}`);
        this.logger.log(`Mirror fields updated for user ${id}`);
    }

    async updateBusinessProfile(
        id    : string,
        fields: Partial<Pick<User, 'avatar' | 'gender'>>,
    ): Promise<User> {
        const user = await this.userModel.findOne({ where: { id } });
        if (!user) throw new NotFoundException(`User ${id} not found`);

        Object.assign(user, fields);
        await user.save();

        await this.redisService.del(`user:profile:${id}`);
        this.logger.log(`Business profile updated for user ${id}`);
        return user;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private getChanges(user: User, dto: UpdateUserDto): Record<string, any> {
        const changes: Record<string, any> = {};
        if (dto.first_name !== undefined && dto.first_name !== user.first_name)
            changes.first_name = { old: user.first_name, new: dto.first_name };
        if (dto.last_name !== undefined && dto.last_name !== user.last_name)
            changes.last_name = { old: user.last_name, new: dto.last_name };
        if (dto.email !== undefined && dto.email !== user.email)
            changes.email = { old: user.email, new: dto.email };
        if (dto.is_active !== undefined && dto.is_active !== user.is_active)
            changes.is_active = { old: user.is_active, new: dto.is_active };
        return changes;
    }

    private async invalidateUserCache(id: string, user: User): Promise<void> {
        await Promise.all([
            this.redisService.del(`user:profile:${id}`),
            this.redisService.del(`user:email:${user.email}`),
            this.redisService.del(`user:phone:${user.phone}`),
            this.redisService.del(`user:keycloak:${user.keycloak_id}`),
        ]);
    }
}