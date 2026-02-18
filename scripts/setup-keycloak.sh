#!/bin/bash

# Keycloak Setup Script for Microservices Platform
# This script configures Keycloak with the 'microservices' realm and required clients

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"
REALM="microservices"

echo "=================================================="
echo "  Keycloak Setup Script for Microservices"
echo "=================================================="
echo ""
echo "Keycloak URL: $KEYCLOAK_URL"
echo "Realm: $REALM"
echo ""

# Function to extract JSON value using grep and sed (no jq needed)
extract_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed 's/.*:.*"\([^"]*\)".*/\1/'
}

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
max_attempts=30
attempt=0
while ! curl -s "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "Error: Keycloak is not ready after $max_attempts attempts"
        exit 1
    fi
    echo "  Attempt $attempt/$max_attempts - waiting..."
    sleep 5
done
echo "✓ Keycloak is ready!"
echo ""

# Get Admin Token
echo "Getting admin token..."
ADMIN_TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" \
    -d "username=$KEYCLOAK_ADMIN" \
    -d "password=$KEYCLOAK_ADMIN_PASSWORD")

ADMIN_TOKEN=$(echo "$ADMIN_TOKEN_RESPONSE" | grep -o '"access_token"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:.*"\([^"]*\)".*/\1/')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "Error: Failed to get admin token"
    echo "Response: $ADMIN_TOKEN_RESPONSE"
    exit 1
fi
echo "✓ Admin token obtained"
echo ""

# Create Realm
echo "Creating realm '$REALM'..."
REALM_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "realm": "'$REALM'",
        "enabled": true,
        "displayName": "Microservices Platform",
        "sslRequired": "external",
        "registrationAllowed": true,
        "registrationEmailAsUsername": true,
        "loginWithEmailAllowed": true,
        "duplicateEmailsAllowed": false,
        "resetPasswordAllowed": true,
        "editUsernameAllowed": false,
        "bruteForceProtected": true,
        "permanentLockout": false,
        "maxFailureWaitSeconds": 900,
        "minimumQuickLoginWaitSeconds": 60,
        "waitIncrementSeconds": 60,
        "quickLoginCheckMilliSeconds": 1000,
        "maxDeltaTimeSeconds": 43200,
        "failureFactor": 30
    }')

if [ "$REALM_RESPONSE" = "201" ] || [ "$REALM_RESPONSE" = "409" ]; then
    echo "✓ Realm '$REALM' ready (HTTP $REALM_RESPONSE)"
else
    echo "Warning: Realm creation returned HTTP $REALM_RESPONSE"
fi
echo ""

# Create Roles
echo "Creating roles..."
for ROLE in "user" "admin"; do
    ROLE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/roles" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "'$ROLE'",
            "description": "'$ROLE' role"
        }')
    echo "  Role '$ROLE': HTTP $ROLE_RESPONSE"
done
echo "✓ Roles created"
echo ""

# Create Public Client for Next.js Frontend
echo "Creating public clients..."
NEXT_CLIENT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "next-web-client",
        "name": "Next.js Web Client",
        "description": "Public client for Next.js frontend",
        "publicClient": true,
        "directAccessGrantsEnabled": true,
        "standardFlowEnabled": true,
        "implicitFlowEnabled": false,
        "serviceAccountsEnabled": false,
        "redirectUris": ["http://localhost:3000/*"],
        "webOrigins": ["http://localhost:3000"],
        "enabled": true,
        "attributes": {
            "pkce.code.challenge.method": "S256"
        }
    }')
echo "  next-web-client: HTTP $NEXT_CLIENT_RESPONSE"

# Create Public Client for Angular Frontend
ANGULAR_CLIENT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "angular-admin-client",
        "name": "Angular Admin Client",
        "description": "Public client for Angular admin dashboard",
        "publicClient": true,
        "directAccessGrantsEnabled": true,
        "standardFlowEnabled": true,
        "implicitFlowEnabled": false,
        "serviceAccountsEnabled": false,
        "redirectUris": ["http://localhost:4200/*"],
        "webOrigins": ["http://localhost:4200"],
        "enabled": true,
        "attributes": {
            "pkce.code.challenge.method": "S256"
        }
    }')
echo "  angular-admin-client: HTTP $ANGULAR_CLIENT_RESPONSE"
echo "✓ Public clients created"
echo ""

# Create Confidential Client for Auth Service
echo "Creating confidential client for auth-service..."
AUTH_SERVICE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "auth-service-client",
        "name": "Auth Service Client",
        "description": "Confidential client for auth service backend",
        "publicClient": false,
        "directAccessGrantsEnabled": true,
        "standardFlowEnabled": false,
        "implicitFlowEnabled": false,
        "serviceAccountsEnabled": true,
        "authorizationServicesEnabled": true,
        "redirectUris": ["*"],
        "enabled": true,
        "clientAuthenticatorType": "client-secret",
        "secret": "auth-service-secret-12345"
    }')
echo "  auth-service-client: HTTP $AUTH_SERVICE_RESPONSE"

# Get the auth-service-client info
echo ""
echo "  Getting client credentials..."
CLIENTS_RESPONSE=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=auth-service-client" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

# Extract client ID (UUID) using grep/sed
AUTH_CLIENT_ID=$(echo "$CLIENTS_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\([^"]*\)".*/\1/')

if [ -n "$AUTH_CLIENT_ID" ] && [ "$AUTH_CLIENT_ID" != "null" ]; then
    echo "  Client UUID: $AUTH_CLIENT_ID"
    echo "  Client Secret: auth-service-secret-12345"
fi
echo "✓ Confidential client created"
echo ""

# Create Test Users
echo "Creating test users..."

# Regular user
USER1_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "user@example.com",
        "email": "user@example.com",
        "firstName": "Test",
        "lastName": "User",
        "enabled": true,
        "emailVerified": true,
        "credentials": [{
            "type": "password",
            "value": "Password123!",
            "temporary": false
        }]
    }')
echo "  user@example.com: HTTP $USER1_RESPONSE"

# Admin user
USER2_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin@example.com",
        "email": "admin@example.com",
        "firstName": "Admin",
        "lastName": "User",
        "enabled": true,
        "emailVerified": true,
        "credentials": [{
            "type": "password",
            "value": "Admin123!",
            "temporary": false
        }]
    }')
echo "  admin@example.com: HTTP $USER2_RESPONSE"

# Get admin user ID and assign role
echo ""
echo "Assigning admin role to admin user..."
USERS_RESPONSE=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/users?username=admin@example.com" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

ADMIN_USER_ID=$(echo "$USERS_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\([^"]*\)".*/\1/')

if [ -n "$ADMIN_USER_ID" ] && [ "$ADMIN_USER_ID" != "null" ]; then
    # Get admin role
    ADMIN_ROLE_RESPONSE=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/roles/admin" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    ADMIN_ROLE_ID=$(echo "$ADMIN_ROLE_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:.*"\([^"]*\)".*/\1/')
    
    if [ -n "$ADMIN_ROLE_ID" ]; then
        # Assign role
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users/$ADMIN_USER_ID/role-mappings/realm" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '[{"id":"'"$ADMIN_ROLE_ID"'","name":"admin"}]' > /dev/null
        echo "  Assigned 'admin' role to admin@example.com"
    fi
fi

echo "✓ Test users created"
echo ""

echo "=================================================="
echo "  Keycloak Setup Complete!"
echo "=================================================="
echo ""
echo "Realm: $REALM"
echo ""
echo "Test Users:"
echo "  - user@example.com / Password123! (role: user)"
echo "  - admin@example.com / Admin123! (role: admin)"
echo ""
echo "Frontend Clients:"
echo "  - next-web-client (for Next.js public-web)"
echo "  - angular-admin-client (for Angular admin-web)"
echo ""
echo "Backend Client:"
echo "  - auth-service-client"
echo "  - Secret: auth-service-secret-12345"
echo ""
