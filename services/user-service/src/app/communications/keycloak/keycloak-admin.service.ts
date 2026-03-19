import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';

@Injectable()
export class KeycloakAdminService implements OnModuleInit {
    private readonly logger = new Logger(KeycloakAdminService.name);
    private client!         : KeycloakAdminClient;
    private readonly realm  : string;

    constructor(private readonly configService: ConfigService) {
        this.realm = this.configService.get('KEYCLOAK_REALM', 'microservices-platform');
    }

    async onModuleInit(): Promise<void> {
        try {
            this.client = new KeycloakAdminClient({
                baseUrl   : this.configService.get('KEYCLOAK_URL', 'http://keycloak:8080'),
                realmName : this.realm,
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

    async createUser(params: {
        username   : string;
        email?     : string;
        first_name?: string | null;
        last_name? : string | null;
        is_active? : boolean;
    }): Promise<string> {
        await this.ensureAuth();

        const response = await this.client.users.create({
            realm         : this.realm,
            username      : params.username,
            email         : params.email         || undefined,
            firstName     : params.first_name    || undefined,
            lastName      : params.last_name     || undefined,
            enabled       : params.is_active     ?? true,
            emailVerified : false,
            // Force password set on first login
            requiredActions: ['UPDATE_PASSWORD'],
        });

        this.logger.log(`Keycloak user created: ${response.id}`);
        return response.id;
    }

    // ─── Identity ─────────────────────────────────────────────────────────────

    async setPassword(keycloak_id: string, new_password: string): Promise<void> {
        await this.ensureAuth();
        await this.client.users.resetPassword({
            realm      : this.realm,
            id         : keycloak_id,
            credential : { type: 'password', value: new_password, temporary: false },
        });
        this.logger.log(`Password updated in Keycloak for ${keycloak_id}`);
    }

    async setEmail(keycloak_id: string, new_email: string): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloak_id },
            { email: new_email, emailVerified: false },
        );
        this.logger.log(`Email updated in Keycloak for ${keycloak_id}`);
    }

    // phone is stored as Keycloak username
    async updateUsername(keycloak_id: string, new_username: string): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloak_id },
            { username: new_username },
        );
        this.logger.log(`Username updated in Keycloak for ${keycloak_id}`);
    }

    async updateName(
        keycloak_id: string,
        first_name : string,
        last_name  : string,
    ): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloak_id },
            { firstName: first_name, lastName: last_name },
        );
        this.logger.log(`Name updated in Keycloak for ${keycloak_id}`);
    }

    async setEnabled(keycloak_id: string, enabled: boolean): Promise<void> {
        await this.ensureAuth();
        await this.client.users.update(
            { realm: this.realm, id: keycloak_id },
            { enabled },
        );
        this.logger.log(`User ${keycloak_id} enabled=${enabled} in Keycloak`);
    }

    // ─── Realm roles (platform-wide) ─────────────────────────────────────────

    async assignRealmRole(keycloak_id: string, role_name: string): Promise<void> {
        await this.ensureAuth();
        const role = await this.client.roles.findOneByName({
            realm: this.realm,
            name : role_name,
        });
        if (!role?.id) throw new Error(`Realm role '${role_name}' not found`);

        await this.client.users.addRealmRoleMappings({
            realm : this.realm,
            id    : keycloak_id,
            roles : [{ id: role.id, name: role.name! }],
        });
        this.logger.log(`Realm role '${role_name}' assigned to ${keycloak_id}`);
    }

    async revokeRealmRole(keycloak_id: string, role_name: string): Promise<void> {
        await this.ensureAuth();
        const role = await this.client.roles.findOneByName({
            realm: this.realm,
            name : role_name,
        });
        if (!role?.id) return; // role doesn't exist — nothing to revoke

        await this.client.users.delRealmRoleMappings({
            realm : this.realm,
            id    : keycloak_id,
            roles : [{ id: role.id, name: role.name! }],
        });
        this.logger.log(`Realm role '${role_name}' revoked from ${keycloak_id}`);
    }

    // ─── Client roles (per-app) ───────────────────────────────────────────────

    async assignClientRole(
        keycloak_id       : string,
        keycloak_client_id: string,
        role_name         : string,
    ): Promise<void> {
        await this.ensureAuth();

        const client_uuid = await this.getClientUUID(keycloak_client_id);
        if (!client_uuid) {
            throw new Error(`Keycloak client '${keycloak_client_id}' not found`);
        }

        const role = await this.client.clients.findRole({
            realm   : this.realm,
            id      : client_uuid,
            roleName: role_name,
        });
        if (!role?.id) throw new Error(`Client role '${role_name}' not found in '${keycloak_client_id}'`);

        await this.client.users.addClientRoleMappings({
            realm          : this.realm,
            id             : keycloak_id,
            clientUniqueId : client_uuid,
            roles          : [{ id: role.id, name: role.name! }],
        });
        this.logger.log(`Client role '${role_name}' assigned to ${keycloak_id} in '${keycloak_client_id}'`);
    }

    async revokeClientRole(
        keycloak_id       : string,
        keycloak_client_id: string,
        role_name         : string,
    ): Promise<void> {
        await this.ensureAuth();

        const client_uuid = await this.getClientUUID(keycloak_client_id);
        if (!client_uuid) return; // client gone — nothing to revoke

        const role = await this.client.clients.findRole({
            realm   : this.realm,
            id      : client_uuid,
            roleName: role_name,
        }).catch(() => null);
        if (!role?.id) return; // role gone — nothing to revoke

        await this.client.users.delClientRoleMappings({
            realm          : this.realm,
            id             : keycloak_id,
            clientUniqueId : client_uuid,
            roles          : [{ id: role.id, name: role.name! }],
        });
        this.logger.log(`Client role '${role_name}' revoked from ${keycloak_id} in '${keycloak_client_id}'`);
    }

    // ─── Groups ───────────────────────────────────────────────────────────────

    async addUserToGroup(keycloak_id: string, group_path: string): Promise<void> {
        await this.ensureAuth();
        const groups = await this.client.groups.find({ realm: this.realm, search: group_path });
        const group  = groups.find(g => g.path === group_path);
        if (!group?.id) throw new Error(`Group '${group_path}' not found`);

        await this.client.users.addToGroup({
            realm  : this.realm,
            id     : keycloak_id,
            groupId: group.id,
        });
        this.logger.log(`User ${keycloak_id} added to group '${group_path}'`);
    }

    async removeUserFromGroup(keycloak_id: string, group_path: string): Promise<void> {
        await this.ensureAuth();
        const groups = await this.client.groups.find({ realm: this.realm, search: group_path });
        const group  = groups.find(g => g.path === group_path);
        if (!group?.id) return;

        await this.client.users.delFromGroup({
            realm  : this.realm,
            id     : keycloak_id,
            groupId: group.id,
        });
        this.logger.log(`User ${keycloak_id} removed from group '${group_path}'`);
    }

    // ─── Client (System) management ───────────────────────────────────────────────

    // Syncs system name and description to the Keycloak client display name.
    // Called when SystemService.update() changes name or description.
    async updateClientInfo(
        keycloak_client_id: string,
        data: { name?: string; description?: string },
    ): Promise<void> {
        await this.ensureAuth();

        const client_uuid = await this.getClientUUID(keycloak_client_id);
        if (!client_uuid) {
            this.logger.warn(`Keycloak client '${keycloak_client_id}' not found — skipping name sync`);
            return;
        }

        await this.client.clients.update(
            { realm: this.realm, id: client_uuid },
            {
                ...(data.name        !== undefined && { name       : data.name        }),
                ...(data.description !== undefined && { description: data.description }),
            },
        );
        this.logger.log(`Keycloak client '${keycloak_client_id}' info updated`);
    }

    // Creates a role on the Keycloak client.
    // Called when SystemService creates a new system_role.
    async createClientRole(
        keycloak_client_id: string,
        role_name         : string,
        description?      : string,
    ): Promise<void> {
        await this.ensureAuth();

        const client_uuid = await this.getClientUUID(keycloak_client_id);
        if (!client_uuid) throw new Error(`Keycloak client '${keycloak_client_id}' not found`);

        await this.client.clients.createRole({
            realm      : this.realm,
            id         : client_uuid,
            name       : role_name,
            description: description || '',
        });
        this.logger.log(`Created Keycloak client role '${role_name}' in '${keycloak_client_id}'`);
    }

    // Deletes a role from the Keycloak client.
    // Called when SystemService removes a system_role.
    async deleteClientRole(
        keycloak_client_id: string,
        role_name         : string,
    ): Promise<void> {
        await this.ensureAuth();

        const client_uuid = await this.getClientUUID(keycloak_client_id);
        if (!client_uuid) return; // client gone — nothing to delete

        try {
            await this.client.clients.delRole({
                realm   : this.realm,
                id      : client_uuid,
                roleName: role_name,
            });
            this.logger.log(`Deleted Keycloak client role '${role_name}' from '${keycloak_client_id}'`);
        } catch (err: any) {
            // Role may already be gone — not a fatal error
            this.logger.warn(`Could not delete role '${role_name}': ${err.message}`);
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async getClientUUID(client_id: string): Promise<string | null> {
        const clients = await this.client.clients.find({
            realm   : this.realm,
            clientId: client_id,
        });
        return clients[0]?.id ?? null;
    }

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