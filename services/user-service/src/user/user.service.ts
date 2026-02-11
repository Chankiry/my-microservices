import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { KafkaService } from '../kafka/kafka.service';
import Profile from 'src/models/profile.model';
import Preference from 'src/models/preference.model';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(Profile)
        private profileModel: typeof Profile,
        @InjectModel(Preference)
        private preferenceModel: typeof Preference,
        private kafkaService: KafkaService,
    ) {}

    // Profile methods
    async getProfile(userId: string) {
        const profile = await this.profileModel.findOne({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        return {
            success: true,
            data: profile,
        };
    }

    async createProfile(userId: string, createProfileDto: CreateProfileDto) {
        // Check if profile already exists
        const existingProfile = await this.profileModel.findOne({
            where: { userId },
        });

        if (existingProfile) {
            throw new ConflictException('Profile already exists for this user');
        }

        const profile = await this.profileModel.create({
            userId,
            ...{createProfileDto},
        });

        // Emit Kafka event
        await this.kafkaService.emit('user.profile.created', {
            userId,
            profileId: profile.id,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Profile created successfully',
            data: profile,
        };
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        const profile = await this.profileModel.findOne({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        // Convert dateOfBirth string to Date if provided
        const updateData = {
            ...updateProfileDto,
            ...(updateProfileDto.dateOfBirth && {
            dateOfBirth: new Date(updateProfileDto.dateOfBirth)
            })
        };

        await profile.update(updateData);

        // Emit Kafka event
        await this.kafkaService.emit('user.profile.updated', {
            userId,
            profileId: profile.id,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Profile updated successfully',
            data: profile,
        };
    }

    async deleteProfile(userId: string) {
        const profile = await this.profileModel.findOne({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Profile not found');
        }

        await profile.destroy();

        // Emit Kafka event
        await this.kafkaService.emit('user.profile.deleted', {
            userId,
            profileId: profile.id,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Profile deleted successfully',
        };
    }

    // Preference methods
    async getPreferences(userId: string) {
        const preferences = await this.preferenceModel.findOne({
            where: { userId },
        });

        if (!preferences) {
            throw new NotFoundException('Preferences not found');
        }

        return {
            success: true,
            data: preferences,
        };
    }

    async createPreferences(userId: string, createPreferenceDto: CreatePreferenceDto) {
        // Check if preferences already exist
        const existingPreferences = await this.preferenceModel.findOne({
            where: { userId },
        });

        if (existingPreferences) {
            throw new ConflictException('Preferences already exist for this user');
        }

        const preferences = await this.preferenceModel.create({
            userId,
            ...createPreferenceDto,
        });

        return {
            success: true,
            message: 'Preferences created successfully',
            data: preferences,
        };
    }

    async updatePreferences(userId: string, updatePreferenceDto: UpdatePreferenceDto) {
        const preferences = await this.preferenceModel.findOne({
            where: { userId },
        });

        if (!preferences) {
            throw new NotFoundException('Preferences not found');
        }

        await preferences.update(updatePreferenceDto);

        return {
            success: true,
            message: 'Preferences updated successfully',
            data: preferences,
        };
    }

    // Event handlers
    async handleUserRegistered(event: { userId: string; email: string; name: string }) {
        // Create default profile and preferences when user registers
        try {
            await this.createProfile(event.userId, {
                avatar: null,
                bio: null,
                phone: null,
                address: null,
            });
        } catch (error) {
            // Profile might already exist, ignore
        }

        try {
            await this.createPreferences(event.userId, {
                language: 'en',
                theme: 'light',
                emailNotifications: true,
                pushNotifications: true,
                smsNotifications: true,
            });
        } catch (error) {
            // Preferences might already exist, ignore
        }
    }
}
