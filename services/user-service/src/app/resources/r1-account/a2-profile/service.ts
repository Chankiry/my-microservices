import {
    Injectable, Logger, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { KeycloakAdminService } from '../../../communications/keycloak/keycloak-admin.service';
import { AuthService } from '../a1-auth/service';
import { RedisService } from '@app/infra/cache/redis.service';
import {
    UpdateProfileDto, ChangePasswordDto, ChangeEmailDto,
    ChangePhoneDto,
} from './dto';
import { UserService } from '@app/resources/r2-user/service';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        private readonly userService   : UserService,
        private readonly keycloakAdmin : KeycloakAdminService,
        private readonly authService   : AuthService,
        private readonly redisService  : RedisService,
    ) {}

    async getProfile(keycloak_id: string) {
        return this.userService.findByKeycloakId(keycloak_id);
    }

    async updateProfile(keycloak_id: string, dto: UpdateProfileDto) {
        const user = await this.getProfile(keycloak_id);

        const nameChanged =
            (dto.first_name !== undefined && dto.first_name !== user.first_name) ||
            (dto.last_name  !== undefined && dto.last_name  !== user.last_name);

        if (nameChanged && user.keycloak_id) {
            const new_first = dto.first_name ?? user.first_name ?? '';
            const new_last  = dto.last_name  ?? user.last_name  ?? '';

            await this.keycloakAdmin.updateName(user.keycloak_id, new_first, new_last);
            this.logger.log(`Name proxied to Keycloak for user ${user.id}`);

            await this.userService.updateMirrorFields(user.id, {
                first_name : dto.first_name ?? user.first_name ?? null,
                last_name  : dto.last_name  ?? user.last_name  ?? null,
            });
        }

        const { first_name, last_name, ...profileFields } = dto;

        if (Object.keys(profileFields).length > 0) {
            return this.userService.updateBusinessProfile(user.id, profileFields);
        }

        if (nameChanged) {
            return this.userService.findByKeycloakId(keycloak_id);
        }

        return user;
    }

    async changePassword(keycloak_id: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
        const user = await this.getProfile(keycloak_id);
        if (!user.keycloak_id) throw new UnauthorizedException('User not linked to identity provider');

        await this.keycloakAdmin.setPassword(user.keycloak_id, dto.new_password);
        this.logger.log(`Password changed for user ${user.id}`);
        return { success: true };
    }

    async changeEmail(keycloak_id: string, dto: ChangeEmailDto): Promise<{ success: boolean }> {
        const user = await this.getProfile(keycloak_id);
        if (!user.keycloak_id) throw new UnauthorizedException('User not linked to identity provider');

        await this.keycloakAdmin.setEmail(user.keycloak_id, dto.new_email);
        this.logger.log(`Email change submitted for user ${user.id}`);
        return { success: true };
    }

    async changePhone(keycloak_id: string, dto: ChangePhoneDto): Promise<{ success: boolean }> {
        const user = await this.getProfile(keycloak_id);
        if (!user.keycloak_id) throw new UnauthorizedException('User not linked to identity provider');

        await this.keycloakAdmin.updateUsername(user.keycloak_id, dto.new_phone);
        await this.userService.updatePhone(user.id, dto.new_phone);
        this.logger.log(`Phone updated for user ${user.id}`);
        return { success: true };
    }

    async logout(keycloak_id: string, token?: string): Promise<{ success: boolean }> {
        if (token) {
            await this.authService.blacklistToken(token, 86_400);
            this.logger.log(`Token blacklisted for ${keycloak_id}`);
        }
        await this.redisService.delPattern(`session:${keycloak_id}:*`);
        return { success: true };
    }
}