import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../models/user.model';
import { KeycloakService } from './keycloak.service';
import { KafkaService } from '../kafka/kafka.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './entities/auth.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User)
        private userModel: typeof User,
        private jwtService: JwtService,
        private keycloakService: KeycloakService,
        private kafkaService: KafkaService,
    ) {}

    async register(registerDto: RegisterDto): Promise<AuthResponse> {
        const { email, password, name } = registerDto;

        // Check if user already exists
        const existingUser = await this.userModel.findOne({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Create user in Keycloak
        let keycloakId: string;
        try {
            keycloakId = await this.keycloakService.createUser(email, password, name);
        } catch (error) {
            throw new BadRequestException(`Failed to create user in Keycloak: ${error.message}`);
        }

        // Create user in local database
        const user = await this.userModel.create({
            email,
            password,
            name,
            keycloakId,
            isActive: true,
        });

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Emit Kafka event
        await this.kafkaService.emit('auth.user.registered', {
            userId: user.id,
            email: user.email,
            name: user.name,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                ...tokens,
            },
        };
    }

    async login(loginDto: LoginDto): Promise<AuthResponse> {
        const { email, password } = loginDto;

        // Authenticate with Keycloak
        let keycloakTokens;
        try {
            keycloakTokens = await this.keycloakService.authenticate(email, password);
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Find or create user in local database
        let user = await this.userModel.findOne({
            where: { email },
        });

        if (!user) {
            // Get user info from Keycloak
            const keycloakUser = await this.keycloakService.getUserInfo(keycloakTokens.access_token);
            
            user = await this.userModel.create({
                email,
                password: 'keycloak-managed', // Password is managed by Keycloak
                name: keycloakUser.name || email.split('@')[0],
                keycloakId: keycloakUser.sub,
                isActive: true,
            });
        }

        // Update last login
        user.lastLoginAt = new Date();
        await user.save();

        // Emit Kafka event
        await this.kafkaService.emit('auth.user.logged_in', {
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
                accessToken: keycloakTokens.access_token,
                refreshToken: keycloakTokens.refresh_token,
                expiresIn: keycloakTokens.expires_in,
            },
        };
    }

    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        try {
            const tokens = await this.keycloakService.refreshToken(refreshToken);
            
            return {
                success: true,
                message: 'Token refreshed successfully',
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresIn: tokens.expires_in,
                    user: tokens.user,
                },
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(token: string): Promise<void> {
        if (token) {
            await this.keycloakService.logout(token);
        }
    }

    async getProfile(userId: string) {
        const user = await this.userModel.findByPk(userId, {
            attributes: { exclude: ['password'] },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return {
            success: true,
            data: user,
        };
    }

    async validateToken(token: string) {
        return this.keycloakService.validateToken(token);
    }

    private async generateTokens(user: User) {
        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
        };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '7d',
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: parseInt(process.env.JWT_EXPIRATION, 10) || 3600,
        };
    }
}
