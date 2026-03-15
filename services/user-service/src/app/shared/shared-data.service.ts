import { Injectable } from '@nestjs/common';
import { RedisService } from '@app/infra/cache/redis.service';

@Injectable()
export class SharedDataService {
    constructor(private readonly redisService: RedisService) {}

    async getSharedConfig(): Promise<any> {
        const cached = await this.redisService.get('shared:config');
        if (cached) {
            return cached;
        }

        const config = {
            version: '1.0.0',
            features: {
                twoFactorAuth: true,
                emailVerification: true,
                smsNotifications: false,
            },
            limits: {
                maxFileSize: 10 * 1024 * 1024, // 10MB
                maxRequestsPerMinute: 100,
            },
        };

        await this.redisService.set('shared:config', config, 3600);
        return config;
    }

    async getFeatureFlags(): Promise<Record<string, boolean>> {
        const cached: any = await this.redisService.get('shared:features');
        if (cached) {
            return cached;
        }

        const features = {
            newUserRegistration: true,
            passwordReset: true,
            emailChange: true,
            accountDeletion: true,
        };

        await this.redisService.set('shared:features', features, 1800);
        return features;
    }
}
