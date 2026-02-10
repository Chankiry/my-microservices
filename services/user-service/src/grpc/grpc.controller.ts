import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/sequelize';
import { Profile, Preference } from '../models';

@Controller()
export class GrpcController {
    constructor(
        @InjectModel(Profile)
        private profileModel: typeof Profile,
        @InjectModel(Preference)
        private preferenceModel: typeof Preference,
    ) {}

    @GrpcMethod('UserService', 'GetProfile')
    async getProfile(data: { id: string }) {
        const profile = await this.profileModel.findOne({
            where: { userId: data.id },
        });

        if (!profile) {
            return null;
        }

        return {
            id: profile.id,
            userId: profile.userId,
            avatar: profile.avatar,
            bio: profile.bio,
            phone: profile.phone,
            address: profile.address,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('UserService', 'CreateProfile')
    async createProfile(data: {
        userId: string;
        avatar?: string;
        bio?: string;
        phone?: string;
        address?: string;
    }) {
        const profile = await this.profileModel.create({
            userId: data.userId,
            avatar: data.avatar,
            bio: data.bio,
            phone: data.phone,
            address: data.address,
        });

        return {
            id: profile.id,
            userId: profile.userId,
            avatar: profile.avatar,
            bio: profile.bio,
            phone: profile.phone,
            address: profile.address,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('UserService', 'UpdateProfile')
    async updateProfile(data: {
        userId: string;
        avatar?: string;
        bio?: string;
        phone?: string;
        address?: string;
    }) {
        const profile = await this.profileModel.findOne({
            where: { userId: data.userId },
        });

        if (!profile) {
            return null;
        }

        await profile.update({
            avatar: data.avatar,
            bio: data.bio,
            phone: data.phone,
            address: data.address,
        });

        return {
            id: profile.id,
            userId: profile.userId,
            avatar: profile.avatar,
            bio: profile.bio,
            phone: profile.phone,
            address: profile.address,
            createdAt: profile.createdAt.toISOString(),
            updatedAt: profile.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('UserService', 'DeleteProfile')
    async deleteProfile(data: { id: string }) {
        const profile = await this.profileModel.findOne({
            where: { userId: data.id },
        });

        if (!profile) {
            return {
                success: false,
                message: 'Profile not found',
            };
        }

        await profile.destroy();

        return {
            success: true,
            message: 'Profile deleted successfully',
        };
    }

    @GrpcMethod('UserService', 'GetPreferences')
    async getPreferences(data: { id: string }) {
        const preferences = await this.preferenceModel.findOne({
            where: { userId: data.id },
        });

        if (!preferences) {
            return null;
        }

        return {
            id: preferences.id,
            userId: preferences.userId,
            language: preferences.language,
            theme: preferences.theme,
            notifications: preferences.emailNotifications,
            createdAt: preferences.createdAt.toISOString(),
            updatedAt: preferences.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('UserService', 'CreatePreferences')
    async createPreferences(data: {
        userId: string;
        language?: string;
        theme?: string;
        notifications?: boolean;
    }) {
        const preferences = await this.preferenceModel.create({
            userId: data.userId,
            language: data.language || 'en',
            theme: data.theme || 'light',
            emailNotifications: data.notifications ?? true,
        });

        return {
            id: preferences.id,
            userId: preferences.userId,
            language: preferences.language,
            theme: preferences.theme,
            notifications: preferences.emailNotifications,
            createdAt: preferences.createdAt.toISOString(),
            updatedAt: preferences.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('UserService', 'UpdatePreferences')
    async updatePreferences(data: {
        userId: string;
        language?: string;
        theme?: string;
        notifications?: boolean;
    }) {
        const preferences = await this.preferenceModel.findOne({
            where: { userId: data.userId },
        });

        if (!preferences) {
            return null;
        }

        await preferences.update({
            language: data.language,
            theme: data.theme,
            emailNotifications: data.notifications,
        });

        return {
            id: preferences.id,
            userId: preferences.userId,
            language: preferences.language,
            theme: preferences.theme,
            notifications: preferences.emailNotifications,
            createdAt: preferences.createdAt.toISOString(),
            updatedAt: preferences.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('UserService', 'HealthCheck')
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'user-service',
        };
    }
}
