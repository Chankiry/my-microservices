import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { UserService } from '../../resources/r2-user/service';
import { AuthService } from '../../resources/r1-account/a1-auth/service';
import User from '../../../models/user/user.model';

@Controller()
export class UserGrpcService {
    private readonly logger = new Logger(UserGrpcService.name);

    constructor(
        private readonly usersService : UserService,
        private readonly authService  : AuthService,
    ) {}

    // ─────────────────────────────────────────
    //  CRUD
    // ─────────────────────────────────────────

    @GrpcMethod('UserService', 'GetUser')
    async getUser(data: { id: string }) {
        this.logger.log(`gRPC GetUser: ${data.id}`);
        try {
            const user = await this.usersService.findById(data.id);
            return this.toProto(user);
        } catch (error: any) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: error.message ?? 'User not found',
            });
        }
    }

    @GrpcMethod('UserService', 'GetUserByEmail')
    async getUserByEmail(data: { email: string }) {
        this.logger.log(`gRPC GetUserByEmail: ${data.email}`);
        const user = await this.usersService.findByEmail(data.email);
        if (!user) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: `No user with email ${data.email}`,
            });
        }
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'GetUserByPhone')
    async getUserByPhone(data: { phone: string }) {
        this.logger.log(`gRPC GetUserByPhone: ${data.phone}`);
        const user = await this.usersService.findByPhone(data.phone);
        if (!user) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: `No user with phone ${data.phone}`,
            });
        }
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'CreateUser')
    async createUser(data: any) {
        const user = await this.usersService.create({
            phone      : data.phone,
            email      : data.email      || null,
            first_name : data.first_name || null,
            last_name  : data.last_name  || null,
        });
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'UpdateUser')
    async updateUser(data: any) {
        const user = await this.usersService.update(data.id, {
            first_name : data.first_name,
            last_name  : data.last_name,
            email      : data.email,
            is_active  : data.is_active,
        });
        return this.toProto(user);
    }

    @GrpcMethod('UserService', 'DeleteUser')
    async deleteUser(data: { id: string }) {
        this.logger.log(`gRPC DeleteUser: ${data.id}`);
        try {
            await this.usersService.remove(data.id);
            return { success: true, message: 'User deleted' };
        } catch (error: any) {
            throw new RpcException({
                code:    status.NOT_FOUND,
                message: error.message ?? 'User not found',
            });
        }
    }

    @GrpcMethod('UserService', 'ListUsers')
    async listUsers(data: any) {
        this.logger.log(`gRPC ListUsers: page=${data.page} limit=${data.limit}`);
        try {
            const result = await this.usersService.findAll({
                page:     data.page  || 1,
                limit:    data.limit || 10,
                search:   data.search   || undefined,
                is_active: data.is_active !== undefined ? data.is_active : undefined,
            });
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
    async validateToken(data: { token: string }) {
        this.logger.log('gRPC ValidateToken');
        try {
            const result = await this.authService.validateToken(data.token);
            if (!result.valid || !result.payload) {
                return { valid: false, user: null, error: result.error ?? 'Invalid token' };
            }
            const user = await this.usersService.findById(result.payload.sub);
            return { valid: true, user: this.toProto(user), error: '' };
        } catch (error: any) {
            return { valid: false, user: null, error: error.message };
        }
    }

    @GrpcMethod('UserService', 'CheckUserExists')
    async checkUserExists(data: any) {
        this.logger.log('gRPC CheckUserExists');
        try {
            let user: User | null = null;

            if (data.id)       user = await this.usersService.findById(data.id).catch(() => null);
            else if (data.email)    user = await this.usersService.findByEmail(data.email);
            else if (data.phone) user = await this.usersService.findByPhone(data.phone);

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