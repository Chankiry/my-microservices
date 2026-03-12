export interface UserEvent {
    eventId: string;
    eventType: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_SYNCED';
    timestamp: string;
    version: string;
    source: 'user-service' | 'keycloak' | 'admin-console';
    data: {
        userId: string;
        keycloakId?: string;
        email?: string;
        username?: string;
        changes?: Record<string, { old: any; new: any }>;
    };
    metadata: {
        correlationId: string;
        causationId?: string;
        traceId?: string;
    };
}