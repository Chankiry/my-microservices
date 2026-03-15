import {
    Injectable,
    Logger,
    OnModuleInit,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { IdempotencyService } from './idempotency.service';
import { UserService } from '@app/resources/r2-user/service';
import User from '@app/models/user/user.model';

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
    // Lifecycle
    // ─────────────────────────────────────────

    async onModuleInit() {
        const brokers = this.configService
            .get<string>('KAFKA_BROKERS', 'kafka:29092')
            .split(',');

        this.kafka = new Kafka({
            clientId: 'user-service-sync',
            brokers,
            retry: {
                initialRetryTime: 300,
                retries: 10,
            },
        });

        this.consumer = this.kafka.consumer({
            groupId: 'user-service-group',
        });

        try {
            await this.consumer.connect();
            this.logger.log('Kafka consumer connected');

            await this.consumer.subscribe({
                topic: 'user.events',
                fromBeginning: false,
            });

            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.handleMessage(payload);
                },
            });

            this.logger.log('Subscribed to topic: user.events');
        } catch (error) {
            this.logger.error(`Failed to start Kafka consumer: ${error.message}`);
            // Don't throw — let the app start even if Kafka is temporarily down
        }
    }

    async onModuleDestroy() {
        try {
            await this.consumer?.disconnect();
            this.logger.log('Kafka consumer disconnected');
        } catch (error) {
            this.logger.error(`Error disconnecting consumer: ${error.message}`);
        }
    }

    // ─────────────────────────────────────────
    // Message Handler
    // ─────────────────────────────────────────

    private async handleMessage({ message }: EachMessagePayload) {
        if (!message.value) return;

        let event: any;
        try {
            event = JSON.parse(message.value.toString());
        } catch (error) {
            this.logger.error(`Failed to parse Kafka message: ${error.message}`);
            return;
        }

        // ── Normalize admin events ───────────────────────────────────────────────
        // Admin events carry userId inside resourcePath: "users/{uuid}"
        // User events carry userId directly in the userId field
        event = this.normalizeEvent(event);

        // Guard — skip if still no valid userId after normalization
        if (!event.userId || event.userId === 'undefined' || event.userId === 'null') {
            this.logger.warn(
                `Skipping event with invalid userId. ` +
                `eventType: ${event.eventType}, resourcePath: ${event.resourcePath}`,
            );
            return;
        }

        const eventId = `${event.userId}-${event.eventType}-${event.timestamp}`;

        if (await this.idempotencyService.isProcessed(eventId)) {
            this.logger.debug(`Skipping duplicate event: ${eventId}`);
            return;
        }

        this.logger.log(
            `Processing event: ${event.eventType} for user: ${event.userId}`,
        );

        try {
            switch (event.eventType) {
                case 'USER_REGISTERED':
                case 'ADMIN_USER_CREATED':
                    await this.handleUserCreated(event); break;

                case 'USER_UPDATED':
                case 'EMAIL_UPDATED':
                case 'ADMIN_USER_UPDATED':
                    await this.handleUserUpdated(event); break;

                case 'USER_DELETED':
                case 'ADMIN_USER_DELETED':
                    await this.handleUserDeleted(event); break;

                case 'USER_LOGIN':
                    await this.handleUserLogin(event); break;

                default:
                    this.logger.warn(`Unknown event type: ${event.eventType}`);
                    return;
            }

            await this.idempotencyService.markProcessed(eventId, event.eventType);
            this.logger.log(`Event processed successfully: ${eventId}`);

        } catch (error) {
            this.logger.error(
                `Failed to process ${event.eventType} for ${event.userId}: ${error.message}`,
            );
            throw error;
        }
    }

    // ── Normalizer ───────────────────────────────────────────────────────────────
    // Converts admin event shape into the same shape as user events
    // so all handlers can work with a consistent structure
    private normalizeEvent(event: any): any {
        const isAdminEvent = event.eventType?.startsWith('ADMIN_');

        if (!isAdminEvent) return event; // user events are already normalized

        // Extract userId from resourcePath: "users/{uuid}" or "users/{uuid}/something"
        if (!event.userId && event.resourcePath) {
            const match = event.resourcePath.match(/^users\/([^\/]+)/);
            if (match) {
                event.userId = match[1];
                event.keycloakId = match[1];
            }
        }

        // Parse representation JSON if present — it contains the full user data
        // This is richer than what the SPI fetches separately
        if (event.representation && typeof event.representation === 'string') {
            try {
                const rep = JSON.parse(event.representation);
                // Only fill fields that are not already set
                event.email        = event.email        ?? rep.email;
                event.username     = event.username     ?? rep.username;
                event.firstName    = event.firstName    ?? rep.firstName;
                event.lastName     = event.lastName     ?? rep.lastName;
                event.enabled      = event.enabled      ?? rep.enabled;
                event.emailVerified = event.emailVerified ?? rep.emailVerified;
            } catch (err) {
                this.logger.warn(`Failed to parse representation JSON: ${err.message}`);
            }
        }

        return event;
    }

    // ─────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────

    private async handleUserCreated(event: any): Promise<void> {
        // Check if user already exists via keycloakId
        const existing = await this.usersService.findByKeycloakId(event.userId);

        if (existing) {
            this.logger.warn(`User already exists for keycloakId: ${event.userId}`);
            return;
        }

        // Check by email as secondary check
        if (event.email) {
            const existingByEmail = await this.usersService.findByEmail(event.email);
            if (existingByEmail) {
                // User exists but missing keycloakId — link them
                this.logger.log(
                    `Linking existing user ${existingByEmail.id} to keycloakId: ${event.userId}`,
                );
                await this.usersService.updateKeycloakId(
                    existingByEmail.id,
                    event.userId,
                );
                return;
            }
        }

        // Create new user using your existing CreateUserDto shape
        // Create new user using your existing CreateUserDto shape
        await this.usersService.create({
            username: event.username || event.email?.split('@')[0],
            email: event.email,
            firstName: event.firstName || null,
            lastName: event.lastName || null,
            keycloakId: event.keycloakId || event.userId,
            isActive: event.enabled ?? true,
            emailVerified: event.emailVerified ?? false,
            roles: ['user'],    // Default role
        } as any);

        this.logger.log(`User created from Keycloak event: ${event.userId}`);
    }

    private async handleUserUpdated(event: any): Promise<void> {
        console.log(event);
        // ✅ Extra guard
        if (!event.userId) {
            this.logger.warn('handleUserUpdated called with no userId, skipping');
            return;
        }

        const user = await this.usersService.findByKeycloakId(event.userId);

        if (!user) {
            this.logger.warn(`User not found for update, creating: ${event.userId}`);
            await this.handleUserCreated(event);
            return;
        }

        const updatePayload: any = {};
        if (event.email && event.email !== user.email)
            updatePayload.email = event.email;
        if (event.firstName !== undefined && event.firstName !== user.firstName)
            updatePayload.firstName = event.firstName;
        if (event.lastName !== undefined && event.lastName !== user.lastName)
            updatePayload.lastName = event.lastName;
        if (event.enabled !== undefined && event.enabled !== user.isActive)
            updatePayload.isActive = event.enabled;
        if (event.emailVerified !== undefined)
            updatePayload.emailVerified = event.emailVerified;

        if (Object.keys(updatePayload).length > 0) {
            await this.usersService.update(user.id, updatePayload);
            this.logger.log(`User updated from Keycloak: ${event.userId}`);
        } else {
            this.logger.debug(`No changes for user: ${event.userId}`);
        }
    }

    private async handleUserDeleted(event: any): Promise<void> {
        // ✅ Extra guard
        if (!event.userId) {
            this.logger.warn('handleUserDeleted called with no userId, skipping');
            return;
        }

        const user = await this.usersService.findByKeycloakId(event.userId);
        if (!user) {
            this.logger.warn(`User not found for deletion: ${event.userId}`);
            return;
        }

        await this.usersService.remove(user.id);
        this.logger.log(`User deleted from Keycloak: ${event.userId}`);
    }

    private async handleUserLogin(event: any): Promise<void> {
        try {
            const user = await this.usersService.findByKeycloakId(event.userId);

            if (!user) return;

            // Update last login using your existing update method
            await this.usersService.update(user.id, {
                lastLoginAt: new Date(event.timestamp),
            } as any);
        } catch (error) {
            // Non-critical — don't fail on login tracking
            this.logger.warn(
                `Could not update last login for user: ${event.userId}`,
            );
        }
    }
}