import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { KeycloakService } from '../keycloak.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private keycloakService: KeycloakService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
        
        // Validate token with Keycloak
        try {
            const tokenInfo = await this.keycloakService.validateToken(token);
            
            if (!tokenInfo.active) {
                throw new UnauthorizedException('Token is not active');
            }

            return {
                sub: payload.sub,
                email: payload.email,
                name: payload.name,
                roles: payload.realm_access?.roles || [],
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
