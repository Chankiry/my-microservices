import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IdempotencyService } from './idempotency.service';
import { UserService } from '@app/resources/r2-user/service';

// ─────────────────────────────────────────
//  Typed Keycloak event shape
// ─────────────────────────────────────────
interface KeycloakUserEvent {
    eventType : string;
    userId    : string;
    keycloakId: string;
    email?    : string;
    username? : string;
    firstName?: string;
    lastName? : string;
    enabled?  : boolean;
    emailVerified?: boolean;
    timestamp : number;
    representation?: string; // raw JSON from admin events
}

@Injectable()
export class UserSyncConsumer implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(UserSyncConsumer.name);
    private consumer: Consumer;
    private kafka: Kafka;

    constructor(
        private readonly usersService: UserService,
        private readonly idempotencyService: IdempotencyService,
        private readonly configService: ConfigService,
    ) {}

    // ─────────────────────────────────────────
    //  Lifecycle
    // ─────────────────────────────────────────

    async onModuleInit(): Promise<void> {
        const brokers = this.configService
            .get<string>('KAFKA_BROKERS', 'kafka:29092')
            .split(',')
            .map(b => b.trim());

        this.kafka = new Kafka({
            clientId: 'user-service-sync',
            brokers,
            retry: { initialRetryTime: 300, retries: 10 },
        });

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

    // ─────────────────────────────────────────
    //  Message dispatcher
    // ─────────────────────────────────────────

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

                default:
                    this.logger.debug(`Unhandled event type: ${event.eventType}`);
                    return; // don't mark as processed — we didn't handle it
            }

            await this.idempotencyService.markProcessed(eventId, event.eventType);
            this.logger.log(`Event processed: ${eventId}`);
        } catch (error: any) {
            this.logger.error(
                `Failed to process ${event.eventType} for ${event.userId}: ${error.message}`,
            );
            throw error; // re-throw so Kafka retries
        }
    }

    // ─────────────────────────────────────────
    //  Normalizer
    //  Admin events have userId in resourcePath, not directly on the payload.
    //  Flatten both shapes into the same structure before handlers see them.
    // ─────────────────────────────────────────

    private normalizeEvent(event: KeycloakUserEvent): KeycloakUserEvent {
        const isAdminEvent = event.eventType?.startsWith('ADMIN_');
        if (!isAdminEvent) return event;

        // Extract userId from resourcePath: "users/{uuid}"
        if (!event.userId && (event as any).resourcePath) {
            const match = (event as any).resourcePath.match(/^users\/([^/]+)/);
            if (match) {
                event.userId     = match[1];
                event.keycloakId = match[1];
            }
        }

        // Parse representation JSON — richer than separate SPI fetch
        if (event.representation && typeof event.representation === 'string') {
            try {
                const rep            = JSON.parse(event.representation);
                event.email          ??= rep.email;
                event.username       ??= rep.username;
                event.firstName      ??= rep.firstName;
                event.lastName       ??= rep.lastName;
                event.enabled        ??= rep.enabled;
                event.emailVerified  ??= rep.emailVerified;
            } catch {
                this.logger.warn('Could not parse event representation JSON');
            }
        }

        return event;
    }

    // ─────────────────────────────────────────
    //  Handlers
    // ─────────────────────────────────────────

    private async handleUserCreated(event: KeycloakUserEvent): Promise<void> {
        const existing = await this.usersService.findByKeycloakId(event.userId);
        if (existing) {
            this.logger.warn(`User already exists for keycloakId: ${event.userId}`);
            return;
        }

        if (event.email) {
            const byEmail = await this.usersService.findByEmail(event.email);
            if (byEmail) {
                this.logger.log(`Linking existing user ${byEmail.id} → keycloakId ${event.userId}`);
                await this.usersService.updateKeycloakId(byEmail.id, event.userId);
                return;
            }
        }

        await this.usersService.create({
            username:      event.username || event.email?.split('@')[0] || event.userId,
            email:         event.email!,
            firstName:     event.firstName  || null,
            lastName:      event.lastName   || null,
            keycloakId:    event.keycloakId || event.userId,
            isActive:      event.enabled    ?? true,
            emailVerified: event.emailVerified ?? false,
            passwordHash:  null, // Keycloak owns credentials
            roles:         ['user'],
        });

        this.logger.log(`Profile created from Keycloak event: ${event.userId}`);
    }

    private async handleUserUpdated(event: KeycloakUserEvent): Promise<void> {
        const user = await this.usersService.findByKeycloakId(event.userId);

        if (!user) {
            this.logger.warn(`No local user for keycloakId ${event.userId} — creating instead`);
            await this.handleUserCreated(event);
            return;
        }

        // Only update identity mirror fields that actually changed.
        // We use updateMirrorFields() — which does NOT emit a Kafka event —
        // to avoid re-broadcasting what was already a Keycloak-originated event.
        const mirror: Record<string, any> = {};

        if (event.email         !== undefined && event.email         !== user.email)
            mirror.email         = event.email;
        if (event.firstName     !== undefined && event.firstName     !== user.firstName)
            mirror.firstName     = event.firstName;
        if (event.lastName      !== undefined && event.lastName      !== user.lastName)
            mirror.lastName      = event.lastName;
        if (event.enabled       !== undefined && event.enabled       !== user.isActive)
            mirror.isActive      = event.enabled;
        if (event.emailVerified !== undefined)
            mirror.emailVerified = event.emailVerified;

        if (Object.keys(mirror).length === 0) {
            this.logger.debug(`No mirror changes for user ${event.userId}`);
            return;
        }

        await this.usersService.updateMirrorFields(user.id, mirror);
        this.logger.log(`Identity mirror updated for ${event.userId}`);
    }

    private async handleUserDeleted(event: KeycloakUserEvent): Promise<void> {
        const user = await this.usersService.findByKeycloakId(event.userId);
        if (!user) {
            this.logger.warn(`No local user for deletion: ${event.userId}`);
            return;
        }

        await this.usersService.remove(user.id);
        this.logger.log(`User soft-deleted from Keycloak event: ${event.userId}`);
    }

    private async handleUserLogin(event: KeycloakUserEvent): Promise<void> {
        try {
            const user = await this.usersService.findByKeycloakId(event.userId);
            if (!user) return;

            await this.usersService.updateLastLogin(user.id);
        } catch (error: any) {
            // Non-critical — don't fail the whole message for a login timestamp
            this.logger.warn(`Could not update lastLoginAt for ${event.userId}: ${error.message}`);
        }
    }
}