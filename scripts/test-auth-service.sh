#!/bin/bash

# Local Auth Service Test Script
# This script tests the auth service endpoints

AUTH_URL="${AUTH_URL:-http://localhost:3001}"

echo "=================================================="
echo "  Auth Service Test Script"
echo "=================================================="
echo ""
echo "Auth Service URL: $AUTH_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test health endpoint
echo "1. Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$AUTH_URL/health")
echo "   Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "   ${GREEN}✓ Health check passed${NC}"
else
    echo -e "   ${RED}✗ Health check failed${NC}"
fi
echo ""

# Test registration
echo "2. Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "Password123!",
        "name": "Test User"
    }')
echo "   Response: $REGISTER_RESPONSE"
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "   ${GREEN}✓ Registration passed${NC}"
else
    echo -e "   ${RED}✗ Registration failed (user may already exist)${NC}"
fi
echo ""

# Test login
echo "3. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "password": "Password123!"
    }')
echo "   Response: $LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
    echo -e "   ${GREEN}✓ Login passed${NC}"
    # Extract token
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')
    echo "   Token: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "   ${RED}✗ Login failed${NC}"
fi
echo ""

# Test profile with token
if [ -n "$ACCESS_TOKEN" ]; then
    echo "4. Testing Profile Endpoint..."
    PROFILE_RESPONSE=$(curl -s "$AUTH_URL/auth/profile" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    echo "   Response: $PROFILE_RESPONSE"
    if echo "$PROFILE_RESPONSE" | grep -q '"email"'; then
        echo -e "   ${GREEN}✓ Profile endpoint passed${NC}"
    else
        echo -e "   ${RED}✗ Profile endpoint failed${NC}"
    fi
    echo ""

    # Test token validation
    echo "5. Testing Token Validation..."
    VALIDATE_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/validate" \
        -H "Content-Type: application/json" \
        -d "{\"token\": \"$ACCESS_TOKEN\"}")
    echo "   Response: $VALIDATE_RESPONSE"
    if echo "$VALIDATE_RESPONSE" | grep -q '"valid":true'; then
        echo -e "   ${GREEN}✓ Token validation passed${NC}"
    else
        echo -e "   ${RED}✗ Token validation failed${NC}"
    fi
    echo ""

    # Test refresh token
    echo "6. Testing Token Refresh..."
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*' | sed 's/"refreshToken":"//')
    REFRESH_RESPONSE=$(curl -s -X POST "$AUTH_URL/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
    echo "   Response: $REFRESH_RESPONSE"
    if echo "$REFRESH_RESPONSE" | grep -q '"accessToken"'; then
        echo -e "   ${GREEN}✓ Token refresh passed${NC}"
    else
        echo -e "   ${RED}✗ Token refresh failed${NC}"
    fi
    echo ""
fi

echo "=================================================="
echo "  Test Complete!"
echo "=================================================="
