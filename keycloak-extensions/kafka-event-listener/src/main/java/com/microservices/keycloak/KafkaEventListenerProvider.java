package com.microservices.keycloak;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.events.admin.ResourceType;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;

public class KafkaEventListenerProvider implements EventListenerProvider {

    private static final Logger logger =
        Logger.getLogger(KafkaEventListenerProvider.class.getName());

    private final KafkaProducerService kafkaProducer;
    private final KeycloakSession      session;

    public KafkaEventListenerProvider(
            KafkaProducerService kafkaProducer,
            KeycloakSession session) {
        this.kafkaProducer = kafkaProducer;
        this.session       = session;
    }

    // ─── User-facing events (login, register, etc.) ───────────────────────────

    @Override
    public void onEvent(Event event) {
        try {
            switch (event.getType()) {
                case REGISTER:       publishUserEvent("USER_REGISTERED", event); break;
                case UPDATE_PROFILE: publishUserEvent("USER_UPDATED",    event); break;
                case UPDATE_EMAIL:   publishUserEvent("EMAIL_UPDATED",   event); break;
                case LOGIN:          publishUserEvent("USER_LOGIN",       event); break;
                case DELETE_ACCOUNT: publishUserEvent("USER_DELETED",    event); break;
                default: break;
            }
        } catch (Exception e) {
            logger.severe("Failed to publish user event, continuing: " + e.getMessage());
        }
    }

    // ─── Admin events ─────────────────────────────────────────────────────────

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        try {
            ResourceType type = adminEvent.getResourceType();

            // ── User lifecycle ────────────────────────────────────────────────
            if (type == ResourceType.USER) {
                switch (adminEvent.getOperationType()) {
                    case CREATE: publishAdminUserEvent("ADMIN_USER_CREATED", adminEvent); break;
                    case UPDATE: publishAdminUserEvent("ADMIN_USER_UPDATED", adminEvent); break;
                    case DELETE: publishAdminUserEvent("ADMIN_USER_DELETED", adminEvent); break;
                    default: break;
                }
                return;
            }

            // ── Realm role assignments ────────────────────────────────────────
            // resourcePath: users/{userId}/role-mappings/realm
            if (type == ResourceType.REALM_ROLE_MAPPING) {
                switch (adminEvent.getOperationType()) {
                    case CREATE: publishRoleEvent("ADMIN_REALM_ROLE_ASSIGNED", adminEvent, null); break;
                    case DELETE: publishRoleEvent("ADMIN_REALM_ROLE_REMOVED",  adminEvent, null); break;
                    default: break;
                }
                return;
            }

            // ── Client role assignments ───────────────────────────────────────
            // resourcePath: users/{userId}/role-mappings/clients/{clientUuid}
            if (type == ResourceType.CLIENT_ROLE_MAPPING) {
                switch (adminEvent.getOperationType()) {
                    case CREATE: publishRoleEvent("ADMIN_CLIENT_ROLE_ASSIGNED", adminEvent, extractClientId(adminEvent)); break;
                    case DELETE: publishRoleEvent("ADMIN_CLIENT_ROLE_REMOVED",  adminEvent, extractClientId(adminEvent)); break;
                    default: break;
                }
                return;
            }

        } catch (Exception e) {
            logger.severe("Failed to publish admin event, continuing: " + e.getMessage());
        }
    }

    @Override
    public void close() {}

    // ─── Publishers ───────────────────────────────────────────────────────────

    private void publishUserEvent(String eventType, Event event) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType);
            payload.put("userId",    event.getUserId());
            payload.put("keycloakId",event.getUserId());
            payload.put("realmId",   event.getRealmId());
            payload.put("timestamp", event.getTime());

            if (event.getDetails() != null) {
                payload.put("details", event.getDetails());
            }

            // Fetch live user fields from session
            enrichWithUserData(payload, event.getRealmId(), event.getUserId());

            kafkaProducer.sendEvent(event.getUserId(), payload);
            logger.info("Published " + eventType + " for user " + event.getUserId());
        } catch (Exception e) {
            logger.severe("Failed to publish user event " + eventType + ": " + e.getMessage());
        }
    }

    private void publishAdminUserEvent(String eventType, AdminEvent adminEvent) {
        try {
            String resourcePath = adminEvent.getResourcePath();
            if (resourcePath == null || !resourcePath.startsWith("users/")) return;

            // Extract userId: resourcePath = "users/{userId}" or "users/{userId}/..."
            String afterUsers = resourcePath.substring(6);
            String userId = afterUsers.contains("/")
                ? afterUsers.substring(0, afterUsers.indexOf("/"))
                : afterUsers;

            if (userId == null || userId.isEmpty()) return;

            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType",    eventType);
            payload.put("userId",       userId);
            payload.put("keycloakId",   userId);
            payload.put("realmId",      adminEvent.getRealmId());
            payload.put("timestamp",    adminEvent.getTime());
            payload.put("resourcePath", resourcePath);

            if (!eventType.equals("ADMIN_USER_DELETED")) {
                enrichWithUserData(payload, adminEvent.getRealmId(), userId);
            }

            kafkaProducer.sendEvent(userId, payload);
            logger.info("Published " + eventType + " for user " + userId);
        } catch (Exception e) {
            logger.severe("Failed to publish admin user event " + eventType + ": " + e.getMessage());
        }
    }

    /**
     * Publishes a role assignment or removal event.
     *
     * resourcePath shapes:
     *   realm role:  users/{userId}/role-mappings/realm
     *   client role: users/{userId}/role-mappings/clients/{clientUuid}
     *
     * The `representation` field from Keycloak is a JSON array of role objects:
     *   [{"id":"...","name":"admin","composite":false,"clientRole":false,"containerId":"..."}]
     *
     * We pass the raw representation string to the consumer so it can parse the
     * role names from it. The consumer's normalizeEvent() already handles this.
     */
    private void publishRoleEvent(String eventType, AdminEvent adminEvent, String clientKeycloakId) {
        try {
            String resourcePath = adminEvent.getResourcePath();
            if (resourcePath == null || !resourcePath.startsWith("users/")) return;

            // Extract userId from path: users/{userId}/role-mappings/...
            String afterUsers = resourcePath.substring(6); // remove "users/"
            String userId = afterUsers.contains("/")
                ? afterUsers.substring(0, afterUsers.indexOf("/"))
                : afterUsers;

            if (userId == null || userId.isEmpty()) return;

            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType",    eventType);
            payload.put("userId",       userId);
            payload.put("keycloakId",   userId);
            payload.put("realmId",      adminEvent.getRealmId());
            payload.put("timestamp",    adminEvent.getTime());
            payload.put("resourcePath", resourcePath);

            // Include the raw role representation — NestJS consumer parses this
            // to extract [{ id, name }] for each role that was assigned/removed
            if (adminEvent.getRepresentation() != null) {
                payload.put("representation", adminEvent.getRepresentation());
            }

            // For client roles include the clientId so the consumer can look up
            // which system this client belongs to
            if (clientKeycloakId != null) {
                payload.put("clientId", clientKeycloakId);
            }

            kafkaProducer.sendEvent(userId, payload);
            logger.info("Published " + eventType + " for user " + userId
                + (clientKeycloakId != null ? " client=" + clientKeycloakId : ""));
        } catch (Exception e) {
            logger.severe("Failed to publish role event " + eventType + ": " + e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Adds email, username, firstName, lastName, enabled to payload from live session. */
    private void enrichWithUserData(Map<String, Object> payload, String realmId, String userId) {
        try {
            RealmModel realm = session.realms().getRealm(realmId);
            if (realm == null) return;
            UserModel user = session.users().getUserById(realm, userId);
            if (user == null) return;

            payload.put("email",         user.getEmail());
            payload.put("username",      user.getUsername());
            payload.put("firstName",     user.getFirstName());
            payload.put("lastName",      user.getLastName());
            payload.put("enabled",       user.isEnabled());
            payload.put("emailVerified", user.isEmailVerified());
        } catch (Exception e) {
            logger.warning("Could not enrich payload with user data: " + e.getMessage());
        }
    }

    /**
     * Extracts the Keycloak client UUID from the resource path, then resolves it
     * to the client's actual clientId string (e.g. 'plt', 'gis') using the session.
     *
     * Path format: users/{userId}/role-mappings/clients/{clientUuid}
     *
     * The systems table stores keycloak_client_id = 'plt' (the string ID),
     * NOT the internal UUID — so we must resolve here before publishing.
     */
    private String extractClientId(AdminEvent adminEvent) {
        try {
            String path = adminEvent.getResourcePath();
            if (path == null) return null;

            int idx = path.indexOf("/clients/");
            if (idx < 0) return null;

            String after = path.substring(idx + 9); // skip "/clients/"
            // clientUuid ends at next "/" or end of string
            String clientUuid = after.contains("/")
                ? after.substring(0, after.indexOf("/"))
                : after;

            if (clientUuid == null || clientUuid.isEmpty()) return null;

            // Resolve UUID → clientId string via session
            RealmModel realm = session.realms().getRealm(adminEvent.getRealmId());
            if (realm != null) {
                org.keycloak.models.ClientModel client =
                    session.clients().getClientById(realm, clientUuid);
                if (client != null) {
                    // Returns the human-readable clientId, e.g. "plt"
                    return client.getClientId();
                }
            }

            // Fallback: return UUID so consumer can still try to match
            logger.warning("Could not resolve client UUID " + clientUuid + " to clientId — using UUID");
            return clientUuid;
        } catch (Exception e) {
            logger.warning("extractClientId failed: " + e.getMessage());
            return null;
        }
    }
}