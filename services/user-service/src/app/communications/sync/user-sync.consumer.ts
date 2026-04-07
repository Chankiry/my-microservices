import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel }    from '@nestjs/sequelize';
import { ConfigService }  from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IdempotencyService } from './idempotency.service';
import { UserService }        from '@app/resources/r2-user/service';
import SystemRole             from '@models/system/system-role.model';
import UserSystemRole         from '@models/user/user-system-role.model';
import System                 from '@models/system/system.model';

interface KeycloakUserEvent {
    eventType      : string;
    userId         : string;
    keycloakId?    : string;
    email?         : string;
    username?      : string;
    firstName?     : string;
    lastName?      : string;
    enabled?       : boolean;
    emailVerified? : boolean;
    timestamp      : number;
    representation?: string;
    resourceType?  : string;
    resourcePath?  : string;
    roles?         : Array<{ id: string; name: string }>;
    clientId?      : string;
}


@Injectable()
export class UserSyncConsumer implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(UserSyncConsumer.name);
    private readonly system_id      : string;
    private consumer        : Consumer;
    private kafka           : Kafka;


    constructor(
        @InjectModel(SystemRole)
        private readonly systemRoleModel     : typeof SystemRole,
        @InjectModel(UserSystemRole)
        private readonly userSystemRoleModel : typeof UserSystemRole,
        @InjectModel(System)
        private readonly systemModel         : typeof System,
        private readonly userService         : UserService,
        private readonly idempotencyService  : IdempotencyService,
        private readonly configService       : ConfigService,
    ) {
        this.system_id  = this.configService.get('SYSTEM_ID', 'mlmupc-account-system');
    }

    async onModuleInit(): Promise<void> {
        const brokers = this.configService
            .get<string>('KAFKA_BROKERS', 'kafka:29092')
            .split(',')
            .map(b => b.trim());

        this.kafka    = new Kafka({ clientId: 'user-service-sync', brokers, retry: { initialRetryTime: 300, retries: 10 } });
        this.consumer = this.kafka.consumer({ groupId: 'user-service-sync-group' });

        try {
            await this.consumer.connect();
            await this.consumer.subscribe({ topic: 'user.events', fromBeginning: false });
            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.handleMessage(payload);
                },
            });
            this.logger.log('Kafka sync consumer ready — subscribed to user.events');
        } catch (error: any) {
            this.logger.error(`Kafka consumer startup failed: ${error.message}`);
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.consumer?.disconnect();
            this.logger.log('Kafka sync consumer disconnected');
        } catch (error: any) {
            this.logger.error(`Error disconnecting consumer: ${error.message}`);
        }
    }

    private async handleMessage({ message }: EachMessagePayload): Promise<void> {
        if (!message.value) return;

        let event: KeycloakUserEvent;
        try {
            event = JSON.parse(message.value.toString());
        } catch {
            this.logger.error('Failed to parse Kafka message — skipping');
            return;
        }

        event = this.normalizeEvent(event);

        if (!event.userId) {
            this.logger.warn(`Event missing userId, skipping: ${event.eventType}`);
            return;
        }

        const eventId = `${event.userId}-${event.eventType}-${event.timestamp}`;

        if (await this.idempotencyService.isProcessed(eventId)) {
            this.logger.debug(`Duplicate event skipped: ${eventId}`);
            return;
        }

        this.logger.log(`Processing ${event.eventType} for ${event.userId}`);

        try {
            switch (event.eventType) {
                case 'USER_REGISTERED':
                case 'ADMIN_USER_CREATED':
                    await this.handleUserCreated(event);
                    break;
                case 'USER_UPDATED':
                case 'EMAIL_UPDATED':
                case 'ADMIN_USER_UPDATED':
                    await this.handleUserUpdated(event);
                    break;
                case 'USER_DELETED':
                case 'ADMIN_USER_DELETED':
                    await this.handleUserDeleted(event);
                    break;
                case 'USER_LOGIN':
                    await this.handleUserLogin(event);
                    break;
                case 'ADMIN_REALM_ROLE_ASSIGNED':
                case 'REALM_ROLE_ASSIGNED':
                    await this.handleRoleAssigned(event, 'realm');
                    break;
                case 'ADMIN_REALM_ROLE_REMOVED':
                case 'REALM_ROLE_REMOVED':
                    await this.handleRoleRevoked(event, 'realm');
                    break;
                case 'ADMIN_CLIENT_ROLE_ASSIGNED':
                case 'CLIENT_ROLE_ASSIGNED':
                    await this.handleRoleAssigned(event, 'client');
                    break;
                case 'ADMIN_CLIENT_ROLE_REMOVED':
                case 'CLIENT_ROLE_REMOVED':
                    await this.handleRoleRevoked(event, 'client');
                    break;
                default:
                    this.logger.debug(`Unhandled event type: ${event.eventType}`);
                    return;
            }

            await this.idempotencyService.markProcessed(eventId, event.eventType);
            this.logger.log(`Event processed: ${eventId}`);
        } catch (error: any) {
            this.logger.error(`Failed to process ${event.eventType} for ${event.userId}: ${error.message}`);
            throw error;
        }
    }

    private normalizeEvent(event: KeycloakUserEvent): KeycloakUserEvent {
        if (!event.userId && event.resourcePath) {
            const match = event.resourcePath.match(/users\/([a-f0-9-]{36})/);
            if (match) event.userId = match[1];
        }
        if (!event.userId && event.keycloakId) {
            event.userId = event.keycloakId;
        }
        if (typeof event.representation === 'string') {
            try {
                const rep = JSON.parse(event.representation);
                event.firstName    = event.firstName    ?? rep.firstName;
                event.lastName     = event.lastName     ?? rep.lastName;
                event.email        = event.email        ?? rep.email;
                event.enabled      = event.enabled      ?? rep.enabled;
                event.emailVerified= event.emailVerified ?? rep.emailVerified;
                if (Array.isArray(rep)) event.roles = rep;
            } catch { /* ignore */ }
        }
        return event;
    }

    // ─── Private helper — always use this to get a User from keycloak_id ──────
    // Unwraps the { data: User } wrapper that UserService always returns.

    private async findUser(keycloakId: string) {
        const result = await this.userService.findByKeycloakId(keycloakId);
        return result?.data ?? null;  // ← unwrap here, once, in one place
    }

    // ─── User Created ─────────────────────────────────────────────────────────

    private async handleUserCreated(event: KeycloakUserEvent): Promise<void> {
        const existing = await this.findUser(event.userId); // ✅ now null when not found
        if (existing) {
            this.logger.debug(`User already exists for keycloak_id: ${event.userId}`);
            return;
        }

        await this.userService.createFromKeycloak({
            keycloak_id   : event.userId,
            email         : event.email        || null,
            phone         : event.username     || '',
            first_name    : event.firstName    || null,
            last_name     : event.lastName     || null,
            is_active     : event.enabled      ?? true,
            email_verified: event.emailVerified ?? false,
        });

        this.logger.log(`User created from Keycloak: ${event.userId}`);
    }

    // ─── User Updated ─────────────────────────────────────────────────────────

    private async handleUserUpdated(event: KeycloakUserEvent): Promise<void> {
        const user = await this.findUser(event.userId); // ✅ real User or null
        if (!user) {
            this.logger.warn(`User not found for update: ${event.userId} — creating`);
            await this.handleUserCreated(event);
            return;
        }

        const updates: Partial<{
            email         : string | null;
            first_name    : string | null;
            last_name     : string | null;
            is_active     : boolean;
            email_verified: boolean;
        }> = {};

        if (event.email         !== undefined) updates.email          = event.email || null;
        if (event.firstName     !== undefined) updates.first_name     = event.firstName || null;
        if (event.lastName      !== undefined) updates.last_name      = event.lastName  || null;
        if (event.enabled       !== undefined) updates.is_active      = event.enabled;
        if (event.emailVerified !== undefined) updates.email_verified = event.emailVerified;

        if (Object.keys(updates).length > 0) {
            await this.userService.updateMirrorFields(user.id, updates); // ✅ user.id is valid
            this.logger.log(`User updated from Keycloak: ${event.userId}`);
        }
    }

    // ─── User Deleted ─────────────────────────────────────────────────────────

    private async handleUserDeleted(event: KeycloakUserEvent): Promise<void> {
        const user = await this.findUser(event.userId); // ✅
        if (!user) {
            this.logger.warn(`User not found for deletion: ${event.userId}`);
            return;
        }
        await this.userService._removeInternal(user.id);
        this.logger.log(`User deleted from Keycloak: ${event.userId}`);
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    private async handleUserLogin(event: KeycloakUserEvent): Promise<void> {
        try {
            const user = await this.findUser(event.userId); // ✅
            if (!user) return;
            await this.userService.updateLastLogin(user.id);
        } catch (error: any) {
            this.logger.warn(`Could not update last login for: ${event.userId}`);
        }
    }

    // ─── Role Assigned ────────────────────────────────────────────────────────

    private async handleRoleAssigned(
        event    : KeycloakUserEvent,
        roleType : 'realm' | 'client',
    ): Promise<void> {
        const user = await this.findUser(event.userId); // ✅
        if (!user) {
            this.logger.warn(`Role assign ignored — user not found: ${event.userId}`);
            return;
        }

        const roles = event.roles ?? [];
        if (!roles.length) return;

        for (const kRole of roles) {
            const systemRole = await this.findSystemRoleByKeycloak(kRole.name, roleType, event.clientId);
            if (!systemRole) {
                this.logger.debug(`No matching system_role for Keycloak role '${kRole.name}' (${roleType}) — skipping`);
                continue;
            }

            const existing = await this.userSystemRoleModel.findOne({
                where: { user_id: user.id, role_id: systemRole.id },
            });

            if (!existing) {
                await this.userSystemRoleModel.create({
                    user_id   : user.id,
                    system_id : systemRole.system_id,
                    role_id   : systemRole.id,
                    granted_by: null,
                    granted_at: new Date(),
                    creator_id: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                } as any);
                this.logger.log(`Role '${systemRole.slug}' synced from Keycloak: user=${user.id}`);
            }
        }
    }

    // ─── Role Revoked ─────────────────────────────────────────────────────────

    private async handleRoleRevoked(
        event    : KeycloakUserEvent,
        roleType : 'realm' | 'client',
    ): Promise<void> {
        const user = await this.findUser(event.userId); // ✅
        if (!user) return;

        const roles = event.roles ?? [];
        if (!roles.length) return;

        for (const kRole of roles) {
            const systemRole = await this.findSystemRoleByKeycloak(kRole.name, roleType, event.clientId);
            if (!systemRole) continue;

            const userSystemRole = await this.userSystemRoleModel.findOne({
                where: { user_id: user.id, role_id: systemRole.id },
            });

            if (userSystemRole) {
                await userSystemRole.destroy();
                this.logger.log(`Role '${systemRole.slug}' revoked via Keycloak sync: user=${user.id}`);
            }
        }
    }

    // ─── Helper: find SystemRole by Keycloak role name ────────────────────────

    private async findSystemRoleByKeycloak(
        keycloak_role_name : string,
        role_type          : 'realm' | 'client',
        keycloak_client_id?: string,
    ): Promise<SystemRole | null> {
        if (role_type === 'realm') {
            return this.systemRoleModel.findOne({
                where: { system_id: this.system_id, role_type: 'realm', keycloak_role_name },
            });
        }

        if (!keycloak_client_id) return null;

        const system = await this.systemModel.findOne({
            where: { keycloak_client_id },
        });
        if (!system) return null;

        return this.systemRoleModel.findOne({
            where: { system_id: system.id, role_type: 'client', keycloak_role_name },
        });
    }
}