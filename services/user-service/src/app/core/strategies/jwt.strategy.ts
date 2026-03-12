import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

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
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL');
    const realm = configService.get<string>('KEYCLOAK_REALM');

    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKeyProvider: async (request, token, done) => {
            // For RS256, fetch public key from Keycloak JWKS
            // This is simplified; production should cache JWKS
            try {
                const response = await fetch(
                `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
                );
                const keys = await response.json();
                // Extract public key and convert to PEM format
                // Implementation depends on your JWT library
                done(null, keys);
            } catch (error) {
                done(error, null);
            }
            },
        });
    }

    async validate(payload: JwtPayload): Promise<any> {
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token payload');
        }
        return {
            sub: payload.sub,
            username: payload.username,
            email: payload.email,
            roles: payload.roles || [],
        };
    }
}