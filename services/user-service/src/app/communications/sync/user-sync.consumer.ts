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
            this.logger.warn(`User already exists for keycloak_id: ${event.userId}`);
            return;
        }

        if (event.email) {
            const byEmail = await this.usersService.findByEmail(event.email);
            if (byEmail) {
                this.logger.log(`Linking user ${byEmail.id} → keycloak_id ${event.userId}`);
                await this.usersService.updateKeycloakId(byEmail.id, event.userId);
                return;
            }
        }

        // username = phone in our system
        const phone = event.username;
        if (!phone) {
            this.logger.warn(`No phone (username) in event for ${event.userId}, skipping`);
            return;
        }

        await this.usersService.create({
            phone,
            email          : event.email          || null,
            first_name     : event.firstName       || null,
            last_name      : event.lastName        || null,
            keycloak_id    : event.keycloakId      || event.userId,
            is_active      : event.enabled         ?? true,
            email_verified : event.emailVerified   ?? false,
        });

        this.logger.log(`User created from Keycloak event: ${event.userId}`);
    }

    private async handleUserUpdated(event: KeycloakUserEvent): Promise<void> {
        const user = await this.usersService.findByKeycloakId(event.userId);

        if (!user) {
            this.logger.warn(`No local user for ${event.userId} — creating`);
            await this.handleUserCreated(event);
            return;
        }

        const mirror: Record<string, any> = {};
        if (event.username         !== undefined && event.username         !== user.phone)
            mirror.phone          = event.username;
        if (event.email         !== undefined && event.email         !== user.email)
            mirror.email          = event.email;
        if (event.firstName     !== undefined && event.firstName     !== user.first_name)
            mirror.first_name     = event.firstName;
        if (event.lastName      !== undefined && event.lastName      !== user.last_name)
            mirror.last_name      = event.lastName;
        if (event.enabled       !== undefined && event.enabled       !== user.is_active)
            mirror.is_active      = event.enabled;
        if (event.emailVerified !== undefined)
            mirror.email_verified = event.emailVerified;

        if (Object.keys(mirror).length === 0) {
            this.logger.debug(`No mirror changes for ${event.userId}`);
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
        this.logger.log(`User soft-deleted: ${event.userId}`);
    }

    private async handleUserLogin(event: KeycloakUserEvent): Promise<void> {
        try {
            const user = await this.usersService.findByKeycloakId(event.userId);
            if (!user) return;
            await this.usersService.updateLastLogin(user.id);
        } catch (err: any) {
            this.logger.warn(`Could not update last_login_at for ${event.userId}: ${err.message}`);
        }
    }
}