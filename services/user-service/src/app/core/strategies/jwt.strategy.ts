import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { JwtPayload } from '@app/shared/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(private readonly configService: ConfigService) {
        const keycloakUrl = configService.getOrThrow<string>('KEYCLOAK_URL');
        const realm       = configService.getOrThrow<string>('KEYCLOAK_REALM');

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

    async validate(payload: any): Promise<JwtPayload> {
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token payload');
        }

        const realmRoles  = payload.realm_access?.roles || [];
        const clientId    = this.configService.get<string>('KEYCLOAK_CLIENT_ID', '');
        const clientRoles = payload.resource_access?.[clientId]?.roles || [];

        const internalRoles = ['default-roles', 'offline_access', 'uma_authorization'];
        const roles = [...new Set([...realmRoles, ...clientRoles])]
            .filter(role => !internalRoles.some(prefix => role.startsWith(prefix)));

        return {
            sub:          payload.sub,
            username:     payload.preferred_username,
            email:        payload.email,
            roles,
            realmRoles,
            clientRoles,
        };
    }
}