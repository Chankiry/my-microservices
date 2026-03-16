import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateProfileDto, ChangePasswordDto, ChangeEmailDto } from './dto';
import { UserService } from '../../r2-user/service';
import { KeycloakAdminService } from '../../../communications/keycloak/keycloak-admin.service';
import { AuthService } from '../a1-auth/service';
import { RedisService } from '@app/infra/cache/redis.service';
import User from '../../../models/user/user.model';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        private readonly userService        : UserService,
        private readonly keycloakAdmin      : KeycloakAdminService,
        private readonly authService        : AuthService,
        private readonly redisService       : RedisService,
    ) {}

    // ─────────────────────────────────────────
    //  Read
    // ─────────────────────────────────────────

    async getProfile(keycloakId: string): Promise<User> {
        // Delegate entirely to UserService — it owns the cache key strategy.
        // This fixes the old bug where ProfileService used user:profile:{keycloakId}
        // while UserService used user:profile:{db-uuid} — two different keys for the
        // same user causing stale reads.
        const user = await this.userService.findByKeycloakId(keycloakId);
        if (!user) throw new UnauthorizedException('User profile not found');
        return user;
    }

    // ─────────────────────────────────────────
    //  Business profile update
    //  Only touches the JSONB profile column — avatar, phone, timezone etc.
    //  Identity fields (firstName, lastName, email) are Keycloak's domain.
    // ─────────────────────────────────────────

    async updateProfile(keycloakId: string, dto: UpdateProfileDto): Promise<User> {
        const user = await this.getProfile(keycloakId);
        return this.userService.updateBusinessProfile(user.id, dto);
    }

    // ─────────────────────────────────────────
    //  Password change — proxied to Keycloak
    //  user-service NEVER stores or hashes the password.
    // ─────────────────────────────────────────

    async changePassword(keycloakId: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
        const user = await this.getProfile(keycloakId);

        if (!user.keycloakId) {
            throw new UnauthorizedException('User is not linked to an identity provider');
        }

        await this.keycloakAdmin.setPassword(user.keycloakId, dto.newPassword);
        this.logger.log(`Password changed via Keycloak for user ${user.id}`);

        return { success: true };
    }

    // ─────────────────────────────────────────
    //  Email change — proxied to Keycloak
    //  Keycloak fires a USER_UPDATED event after this,
    //  which syncs the new email back into the mirror column via Kafka.
    // ─────────────────────────────────────────

    async changeEmail(keycloakId: string, dto: ChangeEmailDto): Promise<{ success: boolean }> {
        const user = await this.getProfile(keycloakId);

        if (!user.keycloakId) {
            throw new UnauthorizedException('User is not linked to an identity provider');
        }

        await this.keycloakAdmin.setEmail(user.keycloakId, dto.newEmail);
        this.logger.log(`Email change submitted to Keycloak for user ${user.id}`);

        // Don't update the local mirror immediately — wait for the
        // USER_UPDATED Kafka event to come back from Keycloak. This avoids
        // a race condition where two sources write the same field at the same time.
        return { success: true };
    }

    // ─────────────────────────────────────────
    //  Logout — blacklist the current access token
    // ─────────────────────────────────────────

    async logout(keycloakId: string, token?: string): Promise<{ success: boolean }> {
        if (token) {
            // Blacklist for 24h — access tokens expire much sooner (typically 5-15 min),
            // so this is just a safety net for the window before natural expiry.
            await this.authService.blacklistToken(token, 86_400);
            this.logger.log(`Token blacklisted for user ${keycloakId}`);
        }

        await this.redisService.delPattern(`session:${keycloakId}:*`);
        return { success: true };
    }
}