import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { UserService } from '../../resources/r2-user/service';
import { AuthService } from '../../resources/r1-account/a1-auth/service';
import User from '../../../models/user/user.model';
import { Response } from 'express';

@Controller()
export class UserGrpcService {
    private readonly logger = new Logger(UserGrpcService.name);

    constructor(
        private readonly userService : UserService,
        private readonly authService  : AuthService,
    ) {}

    // ─────────────────────────────────────────
    //  CRUD
    // ─────────────────────────────────────────

    @GrpcMethod('UserService', 'GetUser')
    async getUser(
        res: Response, 
        data: { id: string }
    ) {
        this.logger.log(`gRPC GetUser: ${data.id}`);
        try {
            const user = (await this.userService.findById(res, data.id)).data;
            return this.toProto(user);
        } catch (error: any) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: error.message ?? 'User not found',
            });
        }
    }

    @GrpcMethod('UserService', 'GetUserByEmail')
    async getUserByEmail(
        res: Response, 
        data: { email: string }
    ) {
        this.logger.log(`gRPC GetUserByEmail: ${data.email}`);
        const user = (await this.userService.findByEmail(res, data.email)).data;
        if (!user) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: `No user with email ${data.email}`,
            });
        }
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'GetUserByPhone')
    async getUserByPhone(
        res: Response, 
        data: { phone: string }
    ) {
        this.logger.log(`gRPC GetUserByPhone: ${data.phone}`);
        const user = (await this.userService.findByPhone(res, data.phone)).data;
        if (!user) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: `No user with phone ${data.phone}`,
            });
        }
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'CreateUser')
    async createUser(
        res: Response,
        data: any
    ) {
        const user = (await this.userService.create(
            res, 
            {
            phone      : data.phone,
            email      : data.email      || null,
            first_name : data.first_name || null,
            last_name  : data.last_name  || null,
            }
        )).data;
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'UpdateUser')
    async updateUser(
        res: Response, 
        data: any
    ) {
        const user = (await this.userService.update(
            res, 
            data.id, 
            {
                first_name : data.first_name,
                last_name  : data.last_name,
                email      : data.email,
                is_active  : data.is_active,
            }
        )).data;
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'DeleteUser')
    async deleteUser(
        res: Response, 
        data: { id: string }
    ) {
        this.logger.log(`gRPC DeleteUser: ${data.id}`);
        try {
            await this.userService.remove(res, data.id);
            return { success: true, message: 'User deleted' };
        } catch (error: any) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: error.message ?? 'User not found',
            });
        }
    }

    @GrpcMethod('UserService', 'ListUsers')
    async listUsers(
        res: Response,
        data: any
    ) {
        this.logger.log(`gRPC ListUsers: page=${data.page} limit=${data.limit}`);
        try {
            const parsedPage = data.page || 1;
            const parsedPerPage = data.per_page || 10;
            const result = (await this.userService.findAll(
                res,
                data.key,
                parsedPage,
                parsedPerPage
            )).data;
            return {
                users: result.data.map(u => this.toProto(u)),
                total: result.total,
                page:  result.page,
                limit: result.limit,
            };
        } catch (error: any) {
            throw new RpcException({
                code:    status.INTERNAL,
                message: error.message ?? 'Failed to list users',
            });
        }
    }

    // ─────────────────────────────────────────
    //  Utility
    // ─────────────────────────────────────────

    @GrpcMethod('UserService', 'ValidateToken')
    async validateToken(
        res: Response,
        data: { token: string }
    ) {
        this.logger.log('gRPC ValidateToken');
        try {
            const result = await this.authService.validateToken(data.token);
            if (!result.valid || !result.payload) {
                return { valid: false, user: null, error: result.error ?? 'Invalid token' };
            }
            const user = await this.userService.findById(res, result.payload.sub);
            return { valid: true, user: this.toProto(user), error: '' };
        } catch (error: any) {
            return { valid: false, user: null, error: error.message };
        }
    }

    @GrpcMethod('UserService', 'CheckUserExists')
    async checkUserExists(res: Response, data: any) {
        this.logger.log('gRPC CheckUserExists');
        try {
            let user: User | null = null;

            if (data.id)       user = (await this.userService.findById(res, data.id).catch(() => null)).data;
            else if (data.email)    user = await this.userService.findByEmail(res, data.email);
            else if (data.phone) user = await this.userService.findByPhone(res, data.phone);

            return { exists: !!user, user_id: user?.id ?? '' };
        } catch {
            return { exists: false, user_id: '' };
        }
    }

    // ─────────────────────────────────────────
    //  Mapper
    // ─────────────────────────────────────────

    private toProto(user: User | null | any) {
        if (!user) return null;
        return {
            id          : user.id            ?? '',
            phone       : user.phone         ?? '',
            email       : user.email         ?? '',
            first_name  : user.first_name    ?? '',
            last_name   : user.last_name     ?? '',
            is_active   : user.is_active     ?? false,
            created_at  : user.created_at?.toISOString() ?? '',
            updated_at  : user.updated_at?.toISOString() ?? '',
            keycloak_id : user.keycloak_id   ?? '',
        };
    }
}