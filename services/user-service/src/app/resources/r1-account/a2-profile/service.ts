import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UpdateUserDto } from '../../r2-user/dto';
import { RedisService } from '@app/infra/cache/redis.service';
import { KafkaProducerService } from '../../../communications/kafka/kafka-producer.service';
import User from '../../../models/user/user.model';

@Injectable()
export class ProfileService {
    constructor(
        private readonly redisService: RedisService,
        private readonly kafkaProducer: KafkaProducerService,
    ) {}

    async getProfile(userId: string): Promise<User> {
        const cacheKey = `user:profile:${userId}`;
        const cached = await this.redisService.get<User>(cacheKey);

        if (cached) {
            return cached;
        }

        const user = await User.findOne({ where: { keycloakId: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        await this.redisService.set(cacheKey, user, 1800);
        return user;
    }

    async updateProfile(userId: string, updateDto: UpdateUserDto): Promise<User> {
        const user = await User.findOne({ where: { keycloakId: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Update allowed fields only
        if (updateDto.firstName !== undefined) {
            user.firstName = updateDto.firstName;
        }
        if (updateDto.lastName !== undefined) {
            user.lastName = updateDto.lastName;
        }

        await user.save();

        // Invalidate cache
        await this.redisService.del(`user:profile:${userId}`);

        // Emit update event
        await this.kafkaProducer.emitUserUpdated(userId, {
            firstName: updateDto.firstName,
            lastName: updateDto.lastName,
        });

        return user;
    }

    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
    ): Promise<{ success: boolean }> {
        const user = await User.findOne({ where: { keycloakId: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify current password
        const isValid = await user.validatePassword(currentPassword);
        if (!isValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Update password (will be hashed by model hook)
        user.passwordHash = newPassword;
        await user.save();

        // Invalidate all sessions
        await this.redisService.delPattern(`session:${userId}:*`);

        return { success: true };
    }

    async logout(userId: string): Promise<{ success: boolean }> {
        // Invalidate user sessions
        await this.redisService.delPattern(`session:${userId}:*`);
        return { success: true };
    }
}
