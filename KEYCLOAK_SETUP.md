# Keycloak Setup Guide for Microservices Platform

This guide will walk you through setting up Keycloak for the microservices platform.

## Prerequisites

- Docker and Docker Compose installed
- Keycloak running (via `docker-compose up -d keycloak`)

## Step 1: Start Keycloak

```bash
cd my-microservices
docker-compose up -d postgres keycloak
```

Wait for Keycloak to be ready (about 30-60 seconds). You can check the logs:

```bash
docker-compose logs -f keycloak
```

Once you see "Keycloak started", Keycloak is ready.

## Step 2: Access Keycloak Admin Console

1. Open your browser: **http://localhost:8080**
2. Click **Administration Console**
3. Login with:
   - **Username**: `admin`
   - **Password**: `admin123`

## Step 3: Create a New Realm

1. Click on the dropdown in the top-left corner (shows "master")
2. Click **Create Realm**
3. Enter:
   - **Realm name**: `microservices`
4. Click **Create**

## Step 4: Create Roles

1. Go to **Realm Settings** → **Roles** in the left menu
2. Click **Create Role**
3. Create the following roles:

### Role 1: `user`
- **Role name**: `user`
- Click **Save**

### Role 2: `admin`
- **Role name**: `admin`
- Click **Save**

## Step 5: Create Clients

### Client 1: next-web-client (for Next.js frontend)

1. Go to **Clients** in the left menu
2. Click **Create client**
3. **General Settings**:
   - **Client ID**: `next-web-client`
   - **Client type**: `OpenID Connect`
4. Click **Next**
5. **Capability config**:
   - **Client authentication**: ON (toggle it)
   - **Authorization**: OFF
   - **Authentication flow**: 
     - ✅ Standard flow
     - ✅ Direct access grants
6. Click **Next**
7. **Login settings**:
   - **Root URL**: `http://localhost:3000`
   - **Home URL**: `http://localhost:3000`
   - **Valid redirect URIs**: `http://localhost:3000/*`
   - **Valid post logout redirect URIs**: `http://localhost:3000/*`
   - **Web origins**: `http://localhost:3000`
8. Click **Save**

**IMPORTANT**: After saving, go to the **Credentials** tab and note the **Client Secret** (you'll need it for backend services).

### Client 2: angular-admin-client (for Angular admin dashboard)

1. Click **Create client**
2. **General Settings**:
   - **Client ID**: `angular-admin-client`
   - **Client type**: `OpenID Connect`
3. Click **Next**
4. **Capability config**:
   - **Client authentication**: ON
   - **Authentication flow**:
     - ✅ Standard flow
     - ✅ Direct access grants
5. Click **Next**
6. **Login settings**:
   - **Root URL**: `http://localhost:4200`
   - **Home URL**: `http://localhost:4200`
   - **Valid redirect URIs**: `http://localhost:4200/*`
   - **Valid post logout redirect URIs**: `http://localhost:4200/*`
   - **Web origins**: `http://localhost:4200`
7. Click **Save**

### Client 3: admin-cli (for admin operations - already exists)

This client should already exist. Verify:
1. Go to **Clients** → find **admin-cli**
2. Make sure **Direct access grants** is enabled

## Step 6: Create Test Users

### User 1: Regular User

1. Go to **Users** in the left menu
2. Click **Create new user**
3. **General**:
   - **Username**: `user@example.com`
   - **Email**: `user@example.com`
   - **First name**: `Test`
   - **Last name**: `User`
   - **Email verified**: ON
   - **Enabled**: ON
4. Click **Create**
5. Go to **Credentials** tab
6. Click **Set password**
7. Enter:
   - **Password**: `Password123!`
   - **Password confirmation**: `Password123!`
   - **Temporary**: OFF
8. Click **Save**
9. Go to **Role mapping** tab
10. Click **Assign role**
11. Select **user** role
12. Click **Assign**

### User 2: Admin User

1. Click **Create new user**
2. **General**:
   - **Username**: `admin@example.com`
   - **Email**: `admin@example.com`
   - **First name**: `Admin`
   - **Last name**: `User`
   - **Email verified**: ON
   - **Enabled**: ON
3. Click **Create**
4. Go to **Credentials** tab
5. Click **Set password**
6. Enter:
   - **Password**: `Admin123!`
   - **Password confirmation**: `Admin123!`
   - **Temporary**: OFF
7. Click **Save**
8. Go to **Role mapping** tab
9. Click **Assign role**
10. Select both **user** and **admin** roles
11. Click **Assign**

## Step 7: Configure Realm Settings (Optional but Recommended)

### Enable Forgot Password

1. Go to **Realm Settings** → **Login**
2. Toggle **Forgot password**: ON
3. Click **Save**

### Enable User Registration

1. Go to **Realm Settings** → **Login**
2. Toggle **User registration**: ON
3. **Email as username**: ON
4. Click **Save**

## Step 8: Verify Setup

### Test Token Endpoint

```bash
# Test login via Direct Access Grant
curl -X POST "http://localhost:8080/realms/microservices/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=next-web-client" \
  -d "username=user@example.com" \
  -d "password=Password123!" \
  -d "scope=openid profile email"
```

You should receive a JSON response with `access_token`, `refresh_token`, etc.

### Decode Token (Optional)

Go to [jwt.io](https://jwt.io) and paste the `access_token` to verify it contains the correct claims.

## Troubleshooting

### "Invalid client" Error
- Make sure the client ID matches exactly: `next-web-client` or `angular-admin-client`
- Check that the client is **Enabled**

### "Invalid grant" Error
- Verify username and password are correct
- Check that **Direct access grants** is enabled for the client

### "User not found" Error
- Make sure the user exists in the `microservices` realm (not master)
- Check that the user is **Enabled**

### CORS Errors
- Verify **Web origins** is set correctly in the client configuration
- For Next.js: `http://localhost:3000`
- For Angular: `http://localhost:4200`

### Token Expired
- Default access token lifespan is 5 minutes
- Use the refresh token to get a new access token
- Or increase token lifespan in **Realm Settings** → **Tokens**

## Environment Variables

### Next.js Frontend (.env.local)

```env
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=microservices
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=next-web-client
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Angular Frontend (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'microservices',
    clientId: 'angular-admin-client',
  },
};
```

## Quick Setup Script (Alternative)

If you have `jq` installed, you can automate some of this setup:

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin123" | jq -r '.access_token')

# Create realm (if not exists)
curl -X POST "http://localhost:8080/admin/realms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"realm":"microservices","enabled":true}'

# Create roles, clients, users... (see scripts folder for full automation)
```

## Summary of Configuration

| Setting | Value |
|---------|-------|
| Realm | `microservices` |
| Next.js Client ID | `next-web-client` |
| Angular Client ID | `angular-admin-client` |
| Test User | `user@example.com` / `Password123!` |
| Test Admin | `admin@example.com` / `Admin123!` |
| Roles | `user`, `admin` |

## Next Steps

After completing this setup:

1. Start the Next.js frontend:
   ```bash
   cd frontend/public-web
   npm install
   cp .env.example .env.local
   npm run dev
   ```

2. Test login at http://localhost:3000/login

3. If using microservices, configure them to validate JWT tokens from Keycloak
