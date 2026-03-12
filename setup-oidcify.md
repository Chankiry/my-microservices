# OIDCify Kong Plugin — Setup & Testing Guide

## Prerequisites

- Kong 3.8.0+
- Keycloak running and accessible
- OIDCify binary (`oidcify_1.3.4_linux_amd64/oidcify`) in your project folder

---

## 1. docker-compose.yml — Kong Service Config

Add to the `kong` service:

```yaml
kong:
  image: kong:3.9.1
  environment:
    # ... existing env vars ...
    KONG_PLUGINS: bundled,jwt,cors,rate-limiting,oidcify
    KONG_PLUGINSERVER_NAMES: oidcify
    KONG_PLUGINSERVER_OIDCIFY_START_CMD: /usr/local/bin/oidcify
    KONG_PLUGINSERVER_OIDCIFY_QUERY_CMD: /usr/local/bin/oidcify -dump
  volumes:
    - ./oidcify_1.3.4_linux_amd64/oidcify:/usr/local/bin/oidcify
```

Then restart Kong:
```bash
docker compose up -d --force-recreate kong
```

---

## 2. Verify Plugin Loaded

```bash
curl http://localhost:8001/plugins/schema/oidcify
```

Should return a JSON schema. If it does — plugin is loaded ✅

---

## 3. Create a Kong Consumer

```bash
curl -X POST http://localhost:8001/consumers \
  -d "username=keycloak-user"
```

---

## 4. Install the Plugin (Global)

> **Key rule:** `config.issuer` must match the `iss` claim inside the JWT token (use `localhost`).
> All internal fetch URLs (`jwks_uri`, `token_endpoint`, etc.) must use the Docker service hostname.

```bash
curl -X POST http://localhost:8001/plugins \
  -d "name=oidcify" \
  -d "config.issuer=http://localhost:8080/realms/microservices-platform" \
  -d "config.client_id=kong-gateway" \
  -d "config.client_secret=YOUR_CLIENT_SECRET" \
  -d "config.redirect_uri=http://localhost:8000/callback" \
  -d "config.consumer_name=keycloak-user" \
  -d "config.static_provider_config.authorization_endpoint=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/auth" \
  -d "config.static_provider_config.token_endpoint=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/token" \
  -d "config.static_provider_config.jwks_uri=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/certs" \
  -d "config.static_provider_config.userinfo_endpoint=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/userinfo" \
  -d "config.static_provider_config.id_token_signing_alg_values_supported[]=RS256" \
  -d "config.insecure_skip_verify=true" \
  -d "config.scopes[]=openid" \
  -d "config.scopes[]=profile" \
  -d "config.scopes[]=email"
```

Note the plugin `id` from the response — you'll need it for PATCH commands below.

---

## 5. Add Claim Headers & Bearer JWT Config

```bash
curl -X PATCH http://localhost:8001/plugins/{PLUGIN_ID} \
  -d "config.id_token_claims_header=X-Id-Token-Claims" \
  -d "config.userinfo_claims_header=X-Userinfo-Claims" \
  -d "config.bearer_jwt_allowed_auds[]=account" \
  -d "config.bearer_jwt_allowed_algs[]=RS256"
```

---

## 6. Production: Persistent Session Keys

Without these, every Kong restart invalidates all user sessions.

```bash
# Generate two keys (run twice)
openssl rand -hex 32

curl -X PATCH http://localhost:8001/plugins/{PLUGIN_ID} \
  -d "config.cookie_hash_key_hex=FIRST_KEY_HERE" \
  -d "config.cookie_block_key_hex=SECOND_KEY_HERE"
```

---

## 7. Testing

### Test browser redirect (no token)
```bash
curl -v http://localhost:8000/api/users/profile
```
Expected: `HTTP/1.1 302` → redirects to Keycloak login ✅

### Get a fresh token
```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/microservices-platform/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=kong-gateway" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD" \
  -d "scope=openid profile email" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo $TOKEN
```

### Test with Bearer token
```bash
curl http://localhost:8000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -v 2>&1 | grep "< HTTP"
```

### Expected response codes

| Code | Meaning |
|------|---------|
| `302` | ❌ Token missing or expired → redirected to Keycloak login |
| `401` | ❌ Token invalid or signature failed |
| `503` | ✅ Token accepted, but upstream service is offline |
| `200` | ✅ Fully working |

### Check token issuer (must match config.issuer)
```bash
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | grep -o '"iss":"[^"]*"'
```

### Debug with Kong logs
```bash
# Watch live errors
docker logs microservices-kong 2>&1 | tail -20

# Find a specific request by ID (from X-Kong-Request-Id response header)
docker logs microservices-kong 2>&1 | grep "{REQUEST_ID}"
```

---

## 8. Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `unknown field: discovery` | Wrong field name | Use `config.issuer` not `config.discovery` |
| `Config validation failed: AuthURL required` | Missing static config | Add all `static_provider_config.*` fields |
| `Config validation failed: ConsumerName required` | Missing consumer | Add `config.consumer_name` and create consumer |
| `connection refused localhost:8080` | Kong can't reach Keycloak via localhost | Use `microservices-keycloak:8080` for internal URLs |
| `id token issued by a different provider` | Issuer mismatch | `config.issuer` must match `iss` in token exactly |
| `302` even with valid token | Token expired or issuer mismatch | Get fresh token, check `iss` claim |
| `503` with valid token | ✅ Auth passed, upstream service not running | Start your microservice |

---

## 9. Kong Manager GUI Notes

| Action | GUI | curl |
|--------|-----|------|
| View active plugins | ✅ | ✅ |
| Add new OIDCify plugin | ❌ (known Kong bug with external plugins) | ✅ |
| Delete plugin | ✅ | ✅ |
| Edit plugin config | ❌ | ✅ PATCH request |

---

## 10. URL Reference

| URL | Used by | Hostname |
|-----|---------|----------|
| `config.issuer` | Token `iss` validation | `localhost:8080` (must match token) |
| `static_provider_config.jwks_uri` | Kong fetches keys internally | `microservices-keycloak:8080` |
| `static_provider_config.token_endpoint` | Kong exchanges code for token | `microservices-keycloak:8080` |
| `static_provider_config.authorization_endpoint` | Browser redirect to login | Can use either |
| `config.redirect_uri` | Browser callback after login | `localhost:8000` |