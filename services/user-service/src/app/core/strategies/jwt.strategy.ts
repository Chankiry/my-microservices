import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

export interface JwtPayload {
    sub: string;
    username: string;
    email: string;
    roles: string[];
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        const keycloakUrl = configService.getOrThrow<string>('KEYCLOAK_URL');
        const realm = configService.getOrThrow<string>('KEYCLOAK_REALM');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
            }),
            algorithms: ['RS256'],
        });
    }

    async validate(payload: any): Promise<any> {
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token payload');
        }

        // Extract realm roles
        const realmRoles = payload.realm_access?.roles || [];
        
        // Extract client roles (if needed)
        const clientId = this.configService.get('KEYCLOAK_CLIENT_ID');
        const clientRoles = payload.resource_access?.[clientId]?.roles || [];

        // Combine both, filter out Keycloak internal roles
        const roles = [...new Set([...realmRoles, ...clientRoles])]
            .filter(role => !role.startsWith('default-roles') && 
                            !role.startsWith('offline_access') && 
                            !role.startsWith('uma_authorization'));

        return {
            sub: payload.sub,
            username: payload.preferred_username,  // ← Keycloak uses preferred_username
            email: payload.email,
            roles,
            realmRoles: realmRoles,    // ['admin', 'user']
            clientRoles: clientRoles,  // ['read', 'write']
        };
    }
}