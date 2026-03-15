import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '@app/infra/cache/redis.service';
import { KafkaProducerService } from '../../communications/kafka/kafka-producer.service';
import User from '../../models/user/user.model';

@Injectable()
export class PublicService {
    private readonly logger = new Logger(PublicService.name);

    constructor(
        private readonly redisService: RedisService,
        private readonly kafkaProducer: KafkaProducerService,
    ) {}

    async healthCheck(): Promise<any> {
        const redisHealth = await this.redisService.healthCheck();
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            redis: redisHealth,
        };
    }

    async getPublicInfo(): Promise<any> {
        return {
            name: 'User Service',
            version: '1.0.0',
            description: 'Microservices User Management API',
        };
    }

    async initiatePasswordReset(email: string): Promise<{ success: boolean }> {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if user exists or not
            return { success: true };
        }

        // Generate reset token
        const resetToken = this.generateResetToken();
        const tokenKey = `password-reset:${resetToken}`;

        // Store token with 1 hour expiry
        await this.redisService.set(tokenKey, { userId: user.id, email }, 3600);

        // Emit event for notification service to send email
        await this.kafkaProducer.emitUserUpdated(user.id, {
            type: 'PASSWORD_RESET_REQUEST',
            email: user.email,
            resetToken,
        });

        this.logger.log(`Password reset initiated for ${email}`);
        return { success: true };
    }

    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
        const tokenKey = `password-reset:${token}`;
        const tokenData = await this.redisService.get<{ userId: string; email: string }>(tokenKey);

        if (!tokenData) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        const user = await User.findByPk(tokenData.userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Update password
        user.passwordHash = newPassword;
        await user.save();

        // Delete the reset token
        await this.redisService.del(tokenKey);

        // Invalidate all user sessions
        await this.redisService.delPattern(`session:${user.id}:*`);

        this.logger.log(`Password reset completed for ${tokenData.email}`);
        return { success: true };
    }

    async verifyEmail(token: string): Promise<{ success: boolean }> {
        const tokenKey = `email-verify:${token}`;
        const tokenData = await this.redisService.get<{ userId: string; email: string }>(tokenKey);

        if (!tokenData) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        const user = await User.findByPk(tokenData.userId);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        // Mark email as verified
        user.emailVerified = true;
        await user.save();

        // Delete the verification token
        await this.redisService.del(tokenKey);

        // Update cache
        await this.redisService.del(`user:profile:${user.id}`);

        this.logger.log(`Email verified for ${tokenData.email}`);
        return { success: true };
    }

    private generateResetToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }
}
