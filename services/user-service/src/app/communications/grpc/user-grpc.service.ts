// src/modules/grpc/user-grpc.service.ts
import { Controller, Logger, Inject } from '@nestjs/common';
import { GrpcMethod, Client, ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, from, of } from 'rxjs';
import { UsersService } from 'src/app/resources/r3-user/service';

interface UserServiceGrpc {
    getUser(data: { id: string }): Observable<any>;
    getUserByEmail(data: { email: string }): Observable<any>;
    getUserByUsername(data: { username: string }): Observable<any>;
    createUser(data: any): Observable<any>;
    updateUser(data: any): Observable<any>;
    deleteUser(data: { id: string }): Observable<any>;
    listUsers(data: any): Observable<any>;
    validateToken(data: { token: string }): Observable<any>;
    checkUserExists(data: any): Observable<any>;
}

@Controller()
export class UserGrpcService implements UserServiceGrpc {
    private readonly logger = new Logger(UserGrpcService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
    ) {}

    @GrpcMethod('UserService', 'GetUser')
    async getUser(data: { id: string }): Promise<any> {
        this.logger.log(`gRPC GetUser called: ${data.id}`);
        const user = await this.usersService.findById(data.id);
        return this.mapUserToProto(user);
    }

    @GrpcMethod('UserService', 'GetUserByEmail')
    async getUserByEmail(data: { email: string }): Promise<any> {
        this.logger.log(`gRPC GetUserByEmail called: ${data.email}`);
        const user = await this.usersService.findByEmail(data.email);
        return this.mapUserToProto(user);
    }

    @GrpcMethod('UserService', 'GetUserByUsername')
    async getUserByUsername(data: { username: string }): Promise<any> {
        this.logger.log(`gRPC GetUserByUsername called: ${data.username}`);
        const user = await this.usersService.findByUsername(data.username);
        return this.mapUserToProto(user);
    }

    @GrpcMethod('UserService', 'CreateUser')
    async createUser(data: any): Promise<any> {
        this.logger.log(`gRPC CreateUser called: ${data.username}`);
        const user = await this.usersService.create({
        username: data.username,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        password: data.password,
        roles: data.roles || [],
        });
        return this.mapUserToProto(user);
    }

    @GrpcMethod('UserService', 'UpdateUser')
    async updateUser(data: any): Promise<any> {
        this.logger.log(`gRPC UpdateUser called: ${data.id}`);
        const user = await this.usersService.update(data.id, {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        isActive: data.is_active,
        });
        return this.mapUserToProto(user);
    }

    @GrpcMethod('UserService', 'DeleteUser')
    async deleteUser(data: { id: string }): Promise<any> {
        this.logger.log(`gRPC DeleteUser called: ${data.id}`);
        await this.usersService.remove(data.id);
        return { success: true, message: 'User deleted successfully' };
    }

    @GrpcMethod('UserService', 'ListUsers')
    async listUsers(data: any): Promise<any> {
        this.logger.log(`gRPC ListUsers called: page ${data.page}`);
        const result = await this.usersService.findAll({
        page: data.page || 1,
        limit: data.limit || 10,
        search: data.search,
        isActive: data.is_active,
        });
        return {
        users: result.data.map(u => this.mapUserToProto(u)),
        total: result.total,
        page: result.page,
        limit: result.limit,
        };
    }

    @GrpcMethod('UserService', 'ValidateToken')
    async validateToken(data: { token: string }): Promise<any> {
        this.logger.log('gRPC ValidateToken called');
        try {
        const payload = await this.authService.verifyToken(data.token);
        const user = await this.usersService.findById(payload.sub);
        return {
            valid: true,
            user: this.mapUserToProto(user),
            error: '',
        };
        } catch (error) {
        return {
            valid: false,
            user: null,
            error: error.message,
        };
        }
    }

    @GrpcMethod('UserService', 'CheckUserExists')
    async checkUserExists(data: any): Promise<any> {
        this.logger.log('gRPC CheckUserExists called');
        let user = null;
        
        if (data.id) {
        user = await this.usersService.findById(data.id);
        } else if (data.email) {
        user = await this.usersService.findByEmail(data.email);
        } else if (data.username) {
        user = await this.usersService.findByUsername(data.username);
        }
        
        return {
        exists: !!user,
        userId: user?.id || '',
        };
    }

    private mapUserToProto(user: any): any {
        if (!user) return null;
        return {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        is_active: user.isActive,
        roles: user.roles || [],
        created_at: user.createdAt?.toISOString() || '',
        updated_at: user.updatedAt?.toISOString() || '',
        keycloak_id: user.keycloakId || '',
        };
    }
}