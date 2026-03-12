// src/modules/users/services/keycloak-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from 'src/app/resources/r3-user/service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';

@Injectable()
export class KeycloakSyncService {
    private readonly logger = new Logger(KeycloakSyncService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly keycloakAdmin: KeycloakAdminService,
        private readonly kafkaProducer: KafkaProducerService,
    ) {}

    /**
     * Sync local user to Keycloak
     */
    async syncUserToKeycloak(userId: string): Promise<void> {
        const user = await this.usersService.findById(userId);

        if (!user) {
        throw new Error(`User ${userId} not found`);
        }

        try {
        if (user.keycloakId) {
            // Update existing Keycloak user
            await this.keycloakAdmin.updateUser(user.keycloakId, {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            enabled: user.isActive,
            });

            this.logger.log(`Updated Keycloak user for ${user.email}`);
        } else {
            // Create new Keycloak user
            const keycloakId = await this.keycloakAdmin.createUser({
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            enabled: user.isActive,
            attributes: { localUserId: [user.id] },
            roles: user.roles,
            });

            // Update local user with Keycloak ID
            await this.usersService.updateKeycloakId(user.id, keycloakId);

            this.logger.log(`Created Keycloak user for ${user.email}`);
        }

        // Emit sync event
        await this.kafkaProducer.emitUserUpdated(userId, {
            syncDirection: 'to-keycloak',
            syncedAt: new Date().toISOString(),
        });
        } catch (error) {
        this.logger.error(`Sync to Keycloak failed for ${userId}: ${error.message}`);
        throw error;
        }
    }

    /**
     * Handle events from Keycloak (webhooks or polling)
     */
    async handleKeycloakEvent(event: KeycloakEvent): Promise<void> {
        this.logger.log(`Processing Keycloak event: ${event.type}`);

        switch (event.type) {
        case 'REGISTER':
            await this.handleKeycloakRegistration(event);
            break;
        case 'UPDATE_PROFILE':
            await this.handleKeycloakProfileUpdate(event);
            break;
        case 'DELETE_ACCOUNT':
            await this.handleKeycloakDeletion(event);
            break;
        default:
            this.logger.debug(`Unhandled Keycloak event type: ${event.type}`);
        }
    }

    private async handleKeycloakRegistration(event: KeycloakEvent): Promise<void> {
        // Check if user already exists locally
        const existingUser = await this.usersService.findByKeycloakId(event.userId);
        if (existingUser) {
        return;
        }

        // Fetch user details from Keycloak and create locally
        // This would typically involve calling Keycloak API for user details
        this.logger.log(`Processing Keycloak registration for ${event.userId}`);
    }

    /**
     * Scheduled full synchronization (daily at 2 AM)
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async performFullSync(): Promise<void> {
        this.logger.log('Starting scheduled full sync...');

        const result = {
        created: 0,
        updated: 0,
        errors: 0,
        };

        try {
        // Get all local users without Keycloak ID
        const localUsers = await this.usersService.findAllWithoutKeycloakId();

        for (const user of localUsers) {
            try {
            await this.syncUserToKeycloak(user.id);
            result.created++;
            } catch (error) {
            result.errors++;
            }
        }

        this.logger.log(
            `Full sync completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`,
        );
        } catch (error) {
        this.logger.error(`Full sync failed: ${error.message}`);
        }
    }
}

interface KeycloakEvent {
    type: string;
    userId: string;
    realmId: string;
    clientId: string;
    details: Record<string, any>;
    ipAddress: string;
    time: number;
}