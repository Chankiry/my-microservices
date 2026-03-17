import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';

@Injectable()
export class KeycloakAdminService implements OnModuleInit {
    private readonly logger = new Logger(KeycloakAdminService.name);
    private client!: KeycloakAdminClient;
    private readonly realm: string;

    constructor(private readonly configService: ConfigService) {
        this.realm = this.configService.get('KEYCLOAK_REALM', 'microservices-platform');
    }

    async onModuleInit(): Promise<void> {
        try {
            this.client = new KeycloakAdminClient({
                baseUrl   : this.configService.get('KEYCLOAK_URL', 'http://keycloak:8080'),
                realmName : this.realm,  // ← was 'master', now reads KEYCLOAK_REALM from env
            });

            await this.client.auth({
                grantType    : 'client_credentials',
                clientId     : this.configService.getOrThrow('KEYCLOAK_ADMIN_CLIENT_ID'),
                clientSecret : this.configService.getOrThrow('KEYCLOAK_ADMIN_CLIENT_SECRET'),
            });

            this.logger.log('Keycloak admin client ready');
        } catch (error: any) {
            this.logger.warn(`Keycloak admin init skipped: ${error.message}`);
        }
    }

    /**
     * Set a user's password in Keycloak.
     * Called by the profile password-change endpoint — user-service never stores the hash.
     */
    async setPassword(keycloakId: string, newPassword: string): Promise<void> {
        await this.ensureAuth();
        await this.client.users.resetPassword({
            realm: this.realm,
            id:    keycloakId,
            credential: {
                type:      'password',
                value:     newPassword,
                temporary: false,
            },
        });
        this.logger.log(`Password updated in Keycloak for ${keycloakId}`);
    }

    /**
     * Update the email address in Keycloak.
     * Called by the profile email-change endpoint.
     * The USER_UPDATED Kafka event that Keycloak fires afterwards
     * will sync the new email back into user-service's mirror column.
     */
    async setEmail(keycloakId: string, newEmail: string): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloakId },
            { email: newEmail, emailVerified: false },
        );
        this.logger.log(`Email updated in Keycloak for ${keycloakId}`);
    }

    /**
     * Enable or disable a user in Keycloak.
     * Called by admin activate/deactivate endpoints.
     * The USER_DISABLED/USER_ENABLED Kafka event will sync isActive back.
     */
    async setEnabled(keycloakId: string, enabled: boolean): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloakId },
            { enabled },
        );
        this.logger.log(`User ${keycloakId} enabled=${enabled} in Keycloak`);
    }

    /**
     * Update first and last name in Keycloak.
     * Called when user changes their name via the profile endpoint.
     * Keycloak fires USER_UPDATED event → Kafka → mirror columns updated.
     */
    async updateName(keycloakId: string, firstName: string, lastName: string): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloakId },
            { firstName, lastName },
        );
        this.logger.log(`Name updated in Keycloak for ${keycloakId}`);
    }

    // ─────────────────────────────────────────
    //  Private
    // ─────────────────────────────────────────

    private async ensureAuth(): Promise<void> {
        try {
            await this.client.auth({
                grantType    : 'client_credentials',
                clientId     : this.configService.getOrThrow('KEYCLOAK_ADMIN_CLIENT_ID'),
                clientSecret : this.configService.getOrThrow('KEYCLOAK_ADMIN_CLIENT_SECRET'),
            });
        } catch (error: any) {
            this.logger.error(`Keycloak re-auth failed: ${error.message}`);
            throw error;
        }
    }
}