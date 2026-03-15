import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import { RequiredActionAlias } from '@keycloak/keycloak-admin-client/lib/defs/requiredActionProviderRepresentation';

@Injectable()
export class KeycloakAdminService implements OnModuleInit {
    private readonly logger = new Logger(KeycloakAdminService.name);
    private adminClient!: KeycloakAdminClient;
    private realm: string;

    constructor(private readonly configService: ConfigService) {
        this.realm = this.configService.get('KEYCLOAK_REALM', 'microservices-platform');
    }

    async onModuleInit() {
        try {
            await this.initializeClient();
        } catch (error: any) {
            // Log but don't crash — Keycloak may not be available yet
            console.warn('[KeycloakAdminService] Failed to initialize:', error.message);
        }
    }

    private async initializeClient(): Promise<void> {
        this.adminClient = new KeycloakAdminClient({
            baseUrl: this.configService.get('KEYCLOAK_URL', 'http://localhost:8080'),
            realmName: 'master',
        });

        // Authenticate with admin credentials
        await this.adminClient.auth({
            username: this.configService.get('KEYCLOAK_ADMIN_USERNAME', 'admin'),
            password: this.configService.get('KEYCLOAK_ADMIN_PASSWORD', 'admin123'),
            grantType: 'password',
            clientId: 'admin-cli',
        });

        this.logger.log('✓ Keycloak admin client initialized');
    }

    /**
     * Create user in Keycloak
     */
    async createUser(userData: {
        username: string;
        email: string;
        firstName?: string;
        lastName?: string;
        enabled?: boolean;
        attributes?: Record<string, string[]>;
        roles?: string[];
    }): Promise<string> {
        try {
            const response = await this.adminClient.users.create({
                realm: this.realm,
                username: userData.username,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                enabled: userData.enabled ?? true,
                emailVerified: false,
                attributes: {
                localUserId: [userData.attributes?.localUserId || ''],
                },
                requiredActions: [RequiredActionAlias.VERIFY_EMAIL],
            });

            this.logger.log(`Created Keycloak user: ${response.id}`);

            // Assign roles if provided
            if (userData.roles && userData.roles.length > 0) {
                await this.assignRoles(response.id, userData.roles);
            }

            return response.id;
        } catch (error: any) {
            this.logger.error(`Failed to create Keycloak user: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update user in Keycloak
     */
    async updateUser(
        keycloakId: string,
        userData: {
        firstName?: string;
        lastName?: string;
        email?: string;
        enabled?: boolean;
        },
    ): Promise<void> {
        try {
        await this.adminClient.users.update(
            { realm: this.realm, id: keycloakId },
            {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                enabled: userData.enabled,
            },
        );

            this.logger.log(`Updated Keycloak user: ${keycloakId}`);
        } catch (error: any) {
            this.logger.error(`Failed to update Keycloak user: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete user from Keycloak
     */
    async deleteUser(keycloakId: string): Promise<void> {
        try {
            await this.adminClient.users.del({
                realm: this.realm,
                id: keycloakId,
            });

            this.logger.log(`Deleted Keycloak user: ${keycloakId}`);
        } catch (error: any) {
            this.logger.error(`Failed to delete Keycloak user: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<any | null> {
        try {
            const users = await this.adminClient.users.find({
                realm: this.realm,
                email,
                exact: true,
            });

            return users.length > 0 ? users[0] : null;
        } catch (error: any) {
            this.logger.error(`Failed to find user by email: ${error.message}`);
            return null;
        }
    }

    /**
     * Assign roles to user
     */
    private async assignRoles(userId: string, roleNames: string[]): Promise<void> {
        const roles = await this.adminClient.roles.find({ realm: this.realm });

        const rolesToAssign = roles
            .filter(role => role.id && role.name && roleNames.includes(role.name))
            .map(role => ({
                id: role.id!,
                name: role.name!,
            }));

        await this.adminClient.users.addRealmRoleMappings({
            realm: this.realm,
            id: userId,
            roles: rolesToAssign,
        });
    }
}