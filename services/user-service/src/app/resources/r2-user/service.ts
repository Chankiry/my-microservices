import { HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Op, literal, Sequelize } from 'sequelize';
import { CreateUserDto, UpdateUserDto } from './dto';
import { KafkaProducerService } from '../../communications/kafka/kafka-producer.service';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { OutboxService } from '../../outbox/outbox.service';
import { RedisService } from '@app/infra/cache/redis.service';
import { ERROR_MESSAGE, MESSAGE } from '@app/shared/enums/message.enum';
import {
    CustomCreateOptions,
    CustomSaveOptions,
    CustomDestroyOptions,
    CustomUpdateOptions,
} from '@app/shared/interfaces/custom-option.interface';
import User from '../../../models/user/user.model';
import { Response } from 'express';
import { Pagination, ResponseUtil } from '@app/shared/interfaces/base.interface';

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

    async findById(res: Response, id: string): Promise<any> {
        try {
            const cached = await this.redisService.get<any>(`user:profile:${id}`);
            if (cached) return ResponseUtil.success(res, cached);

            const user = await this.userModel.findOne({ where: { id } });
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            await this.redisService.set(`user:profile:${id}`, user.toJSON(), this.CACHE_TTL);
            return ResponseUtil.success(res, user);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(`[findById] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async findByKeycloakId(res: Response, keycloak_id: string): Promise<any> {
        try {
            const cached = await this.redisService.get<any>(`user:keycloak:${keycloak_id}`);
            if (cached) return ResponseUtil.success(res, cached);

            const user = await this.userModel.findOne({ where: { keycloak_id } });
            if (user) await this.redisService.set(`user:keycloak:${keycloak_id}`, user.toJSON(), this.CACHE_TTL);
            return ResponseUtil.success(res, user);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(`[findByKeycloakId] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async findByEmail(res: Response, email: string): Promise<any> {
        try {
            const cached = await this.redisService.get<any>(`user:email:${email}`);
            if (cached) return ResponseUtil.success(res, cached);

            const user = await this.userModel.findOne({ where: { email } });
            if (user) await this.redisService.set(`user:email:${email}`, user.toJSON(), this.CACHE_TTL);
            return ResponseUtil.success(res, user);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(`[findByEmail] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async findByPhone(res: Response, phone: string): Promise<any> {
        try {
            const cached = await this.redisService.get<any>(`user:phone:${phone}`);
            if (cached) return ResponseUtil.success(res, cached);

            const user = await this.userModel.findOne({ where: { phone } });
            if (user) await this.redisService.set(`user:phone:${phone}`, user.toJSON(), this.CACHE_TTL);
            return ResponseUtil.success(res, user);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(`[findByPhone] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async findAll(
        res: Response,
        key?: string,
        page?: number,
        per_page?: number,
        is_active?: boolean,
    ): Promise<any> {
        try {
            const offset = (page - 1) * per_page;
            const where: any = {};

            if (key) {
                where[Op.or] = [
                    { phone      : { [Op.iLike]: `%${key}%` } },
                    { email      : { [Op.iLike]: `%${key}%` } },
                    { first_name : { [Op.iLike]: `%${key}%` } },
                    { last_name  : { [Op.iLike]: `%${key}%` } },
                ];
            }

            if (is_active !== undefined) where.is_active = is_active;

            const { count, rows } = await this.userModel.findAndCountAll({
                where,
                limit: per_page,
                offset,
                order: [literal('"created_at" DESC')],
            });

            const pagination: Pagination = {
                total_items : count,
                total_pages : Math.ceil(count / per_page),
                page        : Math.ceil((offset + 1) / per_page),
                per_page    : per_page,
            };

            return ResponseUtil.listSuccess(res, rows, pagination);
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.error(`[findAll] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async findActiveUsers(limit = 100): Promise<User[]> {
        return this.userModel.findAll({
            where : { is_active: true },
            limit,
            order : [literal('"last_login_at" DESC NULLS LAST')],
        });
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    async create(res: Response, body: CreateUserDto): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            let keycloak_id = body.keycloak_id || null;

            if (!keycloak_id) {
                try {
                    keycloak_id = await this.keycloakAdmin.createUser({
                        username   : body.phone,
                        email      : body.email || undefined,
                        first_name : body.first_name,
                        last_name  : body.last_name,
                        is_active  : body.is_active ?? true,
                    });
                    this.logger.log(`Keycloak user created: ${keycloak_id}`);
                } catch (kcErr: any) {
                    this.logger.error(`Keycloak create failed: ${kcErr.message}`, kcErr.stack);
                    throw new InternalServerErrorException(ERROR_MESSAGE.OPERATION_FAILED);
                }
            }

            const user = await this.userModel.create(
                {
                    ...body,
                    keycloak_id,
                } as any,
                {
                    transaction     : tx,
                    individualHooks : true,
                    user_id         : body.creator_id || null,
                } as CustomCreateOptions<User>,
            );

            await this.outboxService.saveToOutbox(tx, 'USER_CREATED', 'user', user.id, {
                user_id    : user.id,
                phone      : user.phone,
                email      : user.email,
                first_name : user.first_name,
                last_name  : user.last_name,
            });

            await tx.commit();
            this.logger.log(`User created: ${user.id} keycloak_id: ${keycloak_id}`);
            return ResponseUtil.success(res, user);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[create] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async update(
        res: Response,
        id: string,
        body: UpdateUserDto,
        updater_id?: string,
    ): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const changes = this.getChanges(user, body);
            Object.assign(user, body);

            await user.save({
                transaction : tx,
                user_id     : updater_id,
            } as CustomUpdateOptions<User>);

            if (Object.keys(changes).length > 0) {
                await this.outboxService.saveToOutbox(tx, 'USER_UPDATED', 'user', id, { changes });
            }

            await tx.commit();
            await this.invalidateUserCache(id, user);
            this.logger.log(`User updated: ${id}`);
            return ResponseUtil.success(res, user);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[update] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async remove(
        res: Response,
        id: string,
        deleter_id?: string,
    ): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            await this.outboxService.saveToOutbox(tx, 'USER_DELETED', 'user', id, {
                user_id    : id,
                deleted_at : new Date().toISOString(),
            });

            await user.destroy({
                transaction     : tx,
                individualHooks : true,
                user_id         : deleter_id,
            } as CustomDestroyOptions);

            await tx.commit();
            await this.invalidateUserCache(id, user);
            this.logger.log(`User soft-deleted: ${id}`);
            return ResponseUtil.success(res, null, MESSAGE.DELETE_SUCCESS);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[remove] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    // ─── Targeted updates ─────────────────────────────────────────────────────

    async updateStatus(
        res: Response,
        id: string,
        is_active: boolean,
        updater_id?: string,
    ): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            if (user.keycloak_id) {
                await this.keycloakAdmin.setEnabled(user.keycloak_id, is_active);
            }

            user.is_active = is_active;
            await user.save({
                transaction : tx,
                user_id     : updater_id,
            } as CustomUpdateOptions<User>);

            await tx.commit();
            await this.invalidateUserCache(id, user);
            this.logger.log(`User ${id} is_active=${is_active}`);
            return ResponseUtil.success(res, user);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[updateStatus] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async updateKeycloakId(id: string, keycloak_id: string): Promise<User> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            user.keycloak_id = keycloak_id;
            await user.save({ transaction: tx } as CustomUpdateOptions<User>);

            await tx.commit();
            await this.invalidateUserCache(id, user);
            return user;
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[updateKeycloakId] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async updateLastLogin(id: string): Promise<void> {
        const tx = await this.sequelize.transaction();
        try {
            await this.userModel.update(
                { last_login_at: new Date() },
                { where: { id }, transaction: tx },
            );
            await tx.commit();
            await this.redisService.del(`user:profile:${id}`);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[updateLastLogin] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async updatePhone(id: string, phone: string): Promise<void> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.findOne({ where: { id }, transaction: tx });
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const old_phone = user.phone;
            await this.userModel.update({ phone }, { where: { id }, transaction: tx });

            await tx.commit();
            await this.redisService.del(`user:phone:${old_phone}`);
            await this.redisService.del(`user:phone:${phone}`);
            await this.redisService.del(`user:profile:${id}`);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[updatePhone] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    async updateMirrorFields(id: string, fields: Partial<Pick<User,
        'email' | 'first_name' | 'last_name' | 'is_active' | 'email_verified'
    >>): Promise<void> {
        const tx = await this.sequelize.transaction();
        try {
            await this.userModel.update(fields, { where: { id }, transaction: tx });
            await tx.commit();
            await this.redisService.del(`user:profile:${id}`);
            this.logger.log(`Mirror fields updated for user ${id}`);
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[updateMirrorFields] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    // ─── Create from Keycloak (Kafka sync path) ──────────────────────────────

    async createFromKeycloak(params: {
        keycloak_id    : string;
        phone          : string;
        email?         : string | null;
        first_name?    : string | null;
        last_name?     : string | null;
        is_active?     : boolean;
        email_verified?: boolean;
    }): Promise<User> {
        const tx = await this.sequelize.transaction();
        try {
            const user = await this.userModel.create(
                {
                    keycloak_id   : params.keycloak_id,
                    phone         : params.phone,
                    email         : params.email         ?? null,
                    first_name    : params.first_name    ?? null,
                    last_name     : params.last_name     ?? null,
                    is_active     : params.is_active     ?? true,
                    email_verified: params.email_verified ?? false,
                } as any,
                {
                    transaction     : tx,
                    individualHooks : true,
                    // No user_id — system-initiated, creator_id stays null
                } as CustomCreateOptions<User>,
            );

            await this.outboxService.saveToOutbox(tx, 'USER_CREATED', 'user', user.id, {
                user_id   : user.id,
                phone     : user.phone,
                email     : user.email,
                first_name: user.first_name,
                last_name : user.last_name,
            });

            await tx.commit();
            this.logger.log(`User created from Keycloak sync: ${user.id} keycloak_id: ${params.keycloak_id}`);
            return user;
        } catch (err) {
            await tx.rollback();
            if (err instanceof HttpException) throw err;
            this.logger.error(`[createFromKeycloak] ${err.message}`, err.stack);
            throw new InternalServerErrorException(ERROR_MESSAGE.SOMETHING_WRONG);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private getChanges(user: User, body: UpdateUserDto): Record<string, any> {
        const changes: Record<string, any> = {};
        if (body.first_name !== undefined && body.first_name !== user.first_name)
            changes.first_name = { old: user.first_name, new: body.first_name };
        if (body.last_name !== undefined && body.last_name !== user.last_name)
            changes.last_name = { old: user.last_name, new: body.last_name };
        if (body.email !== undefined && body.email !== user.email)
            changes.email = { old: user.email, new: body.email };
        if (body.is_active !== undefined && body.is_active !== user.is_active)
            changes.is_active = { old: user.is_active, new: body.is_active };
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