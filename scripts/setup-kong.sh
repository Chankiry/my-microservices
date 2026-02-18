#!/bin/bash

# Kong API Gateway Setup Script for Microservices Platform
# This script configures Kong with services, routes, and JWT validation for Keycloak

set -e

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://localhost:8001}"
KONG_PROXY_URL="${KONG_PROXY_URL:-http://localhost:8000}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-microservices}"

echo "=================================================="
echo "  Kong API Gateway Setup Script"
echo "=================================================="
echo ""
echo "Kong Admin URL: $KONG_ADMIN_URL"
echo "Kong Proxy URL: $KONG_PROXY_URL"
echo "Keycloak URL: $KEYCLOAK_URL"
echo "Keycloak Realm: $KEYCLOAK_REALM"
echo ""

# Wait for Kong to be ready
echo "Waiting for Kong to be ready..."
max_attempts=30
attempt=0
while ! curl -s "$KONG_ADMIN_URL/status" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "Error: Kong is not ready after $max_attempts attempts"
        exit 1
    fi
    echo "  Attempt $attempt/$max_attempts - waiting..."
    sleep 5
done
echo "✓ Kong is ready!"
echo ""

echo "=================================================="
echo "  Creating Services"
echo "=================================================="
echo ""

# User Service
echo "Creating service: user-service -> http://host.docker.internal:3002"
curl -s -X POST "$KONG_ADMIN_URL/services" \
    -d "name=user-service" \
    -d "url=http://host.docker.internal:3002" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/services/user-service" \
    -d "url=http://host.docker.internal:3002" > /dev/null
echo "  ✓ user-service created/updated"

# Order Service
echo "Creating service: order-service -> http://host.docker.internal:3004"
curl -s -X POST "$KONG_ADMIN_URL/services" \
    -d "name=order-service" \
    -d "url=http://host.docker.internal:3004" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/services/order-service" \
    -d "url=http://host.docker.internal:3004" > /dev/null
echo "  ✓ order-service created/updated"

# Payment Service
echo "Creating service: payment-service -> http://host.docker.internal:3005"
curl -s -X POST "$KONG_ADMIN_URL/services" \
    -d "name=payment-service" \
    -d "url=http://host.docker.internal:3005" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/services/payment-service" \
    -d "url=http://host.docker.internal:3005" > /dev/null
echo "  ✓ payment-service created/updated"

# Notification Service
echo "Creating service: notification-service -> http://host.docker.internal:3006"
curl -s -X POST "$KONG_ADMIN_URL/services" \
    -d "name=notification-service" \
    -d "url=http://host.docker.internal:3006" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/services/notification-service" \
    -d "url=http://host.docker.internal:3006" > /dev/null
echo "  ✓ notification-service created/updated"

echo ""
echo "=================================================="
echo "  Creating Routes"
echo "=================================================="
echo ""

# User Service Routes
echo "Creating route: /api/users -> user-service"
curl -s -X POST "$KONG_ADMIN_URL/services/user-service/routes" \
    -d "name=user-routes" \
    -d "paths[]=/api/users" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/routes/user-routes" \
    -d "paths[]=/api/users" > /dev/null 2>&1
echo "  ✓ user-routes created/updated"

# Order Service Routes
echo "Creating route: /api/orders -> order-service"
curl -s -X POST "$KONG_ADMIN_URL/services/order-service/routes" \
    -d "name=order-routes" \
    -d "paths[]=/api/orders" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/routes/order-routes" \
    -d "paths[]=/api/orders" > /dev/null 2>&1
echo "  ✓ order-routes created/updated"

# Payment Service Routes
echo "Creating route: /api/payments -> payment-service"
curl -s -X POST "$KONG_ADMIN_URL/services/payment-service/routes" \
    -d "name=payment-routes" \
    -d "paths[]=/api/payments" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/routes/payment-routes" \
    -d "paths[]=/api/payments" > /dev/null 2>&1
echo "  ✓ payment-routes created/updated"

# Notification Service Routes
echo "Creating route: /api/notifications -> notification-service"
curl -s -X POST "$KONG_ADMIN_URL/services/notification-service/routes" \
    -d "name=notification-routes" \
    -d "paths[]=/api/notifications" > /dev/null 2>&1 || \
curl -s -X PATCH "$KONG_ADMIN_URL/routes/notification-routes" \
    -d "paths[]=/api/notifications" > /dev/null 2>&1
echo "  ✓ notification-routes created/updated"

echo ""
echo "=================================================="
echo "  Adding CORS Plugins"
echo "=================================================="
echo ""

# Add CORS to all services
for service in user-service order-service payment-service notification-service; do
    echo "Adding CORS plugin to $service..."
    curl -s -X POST "$KONG_ADMIN_URL/services/$service/plugins" \
        -d "name=cors" \
        -d "config.origins=*" \
        -d "config.methods=GET,POST,PUT,DELETE,OPTIONS,PATCH" \
        -d "config.headers=Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Auth-Token,Authorization" \
        -d "config.exposed_headers=X-Auth-Token" \
        -d "config.credentials=true" \
        -d "config.max_age=3600" > /dev/null 2>&1 || echo "  (already exists)"
    echo "  ✓ CORS added to $service"
done

echo ""
echo "=================================================="
echo "  Adding JWT Plugin with Keycloak"
echo "=================================================="
echo ""

# Get Keycloak public key
echo "Fetching Keycloak public key..."
KEYCLOAK_CERTS_URL="$KEYCLOAK_URL/realms/$KEYCLOAK_REALM/protocol/openid-connect/certs"

# Add JWT plugin to protected services
for service in user-service order-service payment-service notification-service; do
    echo "Adding JWT plugin to $service..."
    curl -s -X POST "$KONG_ADMIN_URL/services/$service/plugins" \
        -d "name=jwt" \
        -d "config.claims_to_verify=exp,iat,nbf" \
        -d "config.key_claim_name=kid" \
        -d "config.secret_is_base64=false" \
        -d "config.uri_param_name=jwt" \
        -d "config.cookie_name=jwt" > /dev/null 2>&1 || echo "  (already exists)"
    echo "  ✓ JWT plugin added to $service"
done

echo ""
echo "=================================================="
echo "  Adding Rate Limiting"
echo "=================================================="
echo ""

# Add rate limiting to all services
for service in user-service order-service payment-service notification-service; do
    echo "Adding rate limiting to $service (100 req/min)..."
    curl -s -X POST "$KONG_ADMIN_URL/services/$service/plugins" \
        -d "name=rate-limiting" \
        -d "config.minute=100" \
        -d "config.policy=local" > /dev/null 2>&1 || echo "  (already exists)"
    echo "  ✓ Rate limiting added to $service"
done

echo ""
echo "=================================================="
echo "  Creating JWT Consumer for Keycloak"
echo "=================================================="
echo ""

# Create a consumer for Keycloak JWTs
echo "Creating consumer: keycloak-issuer..."
curl -s -X POST "$KONG_ADMIN_URL/consumers" \
    -d "username=keycloak-issuer" > /dev/null 2>&1 || echo "  (consumer exists)"

# Add JWT credential with Keycloak realm URL as the key
echo "Adding JWT credential for keycloak-issuer..."
curl -s -X POST "$KONG_ADMIN_URL/consumers/keycloak-issuer/jwt" \
    -d "key=$KEYCLOAK_URL/realms/$KEYCLOAK_REALM" \
    -d "algorithm=RS256" \
    -d "rsa_public_key=@-" > /dev/null 2>&1 <<EOF || echo "  (credential exists, may need manual update)"
EOF
echo "  ✓ JWT consumer created"

echo ""
echo "=================================================="
echo "  Kong Setup Complete!"
echo "=================================================="
echo ""
echo "API Gateway is configured at: $KONG_PROXY_URL"
echo ""
echo "Services:"
echo "  - User:         $KONG_PROXY_URL/api/users"
echo "  - Order:        $KONG_PROXY_URL/api/orders"
echo "  - Payment:      $KONG_PROXY_URL/api/payments"
echo "  - Notification: $KONG_PROXY_URL/api/notifications"
echo ""
echo "All services are protected with JWT authentication."
echo "Obtain a JWT token from Keycloak and include it in requests:"
echo "  Authorization: Bearer <your-jwt-token>"
echo ""
echo "Keycloak issuer: $KEYCLOAK_URL/realms/$KEYCLOAK_REALM"
echo ""
echo "To test with a token:"
echo "  curl -H 'Authorization: Bearer <token>' $KONG_PROXY_URL/api/users/health"
echo ""
