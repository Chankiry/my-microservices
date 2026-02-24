import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from '../auth/auth.service';
import { KeycloakService } from '../auth/keycloak.service';
import { InjectModel } from '@nestjs/sequelize';
import User from '../models/user.model';

@Controller()
export class GrpcController {
    constructor(
        @InjectModel(User)
        private userModel: typeof User,
        private authService: AuthService,
        private keycloakService: KeycloakService,
    ) {}

    @GrpcMethod('AuthService', 'ValidateToken')
    async validateToken(data: { token: string }) {
        try {
            const tokenInfo = await this.keycloakService.validateToken(data.token);
            
            return {
                valid: tokenInfo.active,
                userId: tokenInfo.sub,
                email: tokenInfo.email,
                roles: tokenInfo.realm_access?.roles || [],
                message: tokenInfo.active ? 'Token is valid' : 'Token is invalid',
            };
        } catch (error) {
            return {
                valid: false,
                userId: '',
                email: '',
                roles: [],
                message: error.message,
            };
        }
    }

    @GrpcMethod('AuthService', 'GetUserById')
    async getUserById(data: { id: string }) {
        const user = await this.userModel.findByPk(data.id, {
            attributes: { exclude: ['password'] },
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            keycloakId: user.keycloakId,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('AuthService', 'GetUserByEmail')
    async getUserByEmail(data: { email: string }) {
        const user = await this.userModel.findOne({
            where: { email: data.email },
            attributes: { exclude: ['password'] },
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            keycloakId: user.keycloakId,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('AuthService', 'CreateUser')
    async createUser(data: {
        email: string;
        password: string;
        name: string;
        keycloakId: string;
    }) {
        const user = await this.userModel.create({
            email: data.email,
            password: data.password,
            name: data.name,
            keycloakId: data.keycloakId,
            isActive: true,
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            keycloakId: user.keycloakId,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('AuthService', 'UpdateUser')
    async updateUser(data: {
        id: string;
        email?: string;
        name?: string;
        isActive?: boolean;
    }) {
        const user = await this.userModel.findByPk(data.id);

        if (!user) {
            return null;
        }

        if (data.email) user.email = data.email;
        if (data.name) user.name = data.name;
        if (data.isActive !== undefined) user.isActive = data.isActive;

        await user.save();

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            keycloakId: user.keycloakId,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('AuthService', 'DeleteUser')
    async deleteUser(data: { id: string }) {
        const user = await this.userModel.findByPk(data.id);

        if (!user) {
            return {
                success: false,
                message: 'User not found',
            };
        }

        await user.destroy();

        return {
            success: true,
            message: 'User deleted successfully',
        };
    }

    @GrpcMethod('AuthService', 'HealthCheck')
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'auth-service',
        };
    }
}
