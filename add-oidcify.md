# Get plt-service ID first
curl -s http://localhost:8001/services/plt-service

# Add OIDCify to plt-service
curl -X POST http://localhost:8001/services/plt-service/plugins \
  -d "name=oidcify" \
  -d "enabled=true" \
  -d "config.issuer=http://localhost:8080/realms/microservices-platform" \
  -d "config.client_id=kong-gateway" \
  -d "config.client_secret=EdIP0JSuaoH5qXmyDp60QqOV6zAThNlb" \
  -d "config.redirect_uri=http://localhost:8000/callback" \
  -d "config.consumer_name=keycloak-user" \
  -d "config.static_provider_config.authorization_endpoint=http://localhost:8080/realms/microservices-platform/protocol/openid-connect/auth" \
  -d "config.static_provider_config.token_endpoint=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/token" \
  -d "config.static_provider_config.jwks_uri=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/certs" \
  -d "config.static_provider_config.userinfo_endpoint=http://microservices-keycloak:8080/realms/microservices-platform/protocol/openid-connect/userinfo" \
  -d "config.static_provider_config.id_token_signing_alg_values_supported[]=RS256" \
  -d "config.insecure_skip_verify=true" \
  -d "config.scopes[]=openid" \
  -d "config.scopes[]=profile" \
  -d "config.scopes[]=email" \
  -d "config.bearer_jwt_allowed_auds[]=account" \
  -d "config.bearer_jwt_allowed_algs[]=RS256" \
  -d "config.id_token_claims_header=X-Id-Token-Claims" \
  -d "config.userinfo_claims_header=X-Userinfo-Claims" \
  -d "config.redirect_unauthenticated=false"

# Get user-service OIDCify plugin ID
curl -s http://localhost:8001/services/139cc0d1-caa2-4a82-b94a-d93b70ad30f9/plugins

# Update allowed audiences — add plt and kong-gateway
curl -X PATCH http://localhost:8001/plugins/306379ee-bfae-47ed-a8c3-89b7be34529f \
  -d "config.bearer_jwt_allowed_auds[]=account" \
  -d "config.bearer_jwt_allowed_auds[]=plt" \
  -d "config.bearer_jwt_allowed_auds[]=kong-gateway"