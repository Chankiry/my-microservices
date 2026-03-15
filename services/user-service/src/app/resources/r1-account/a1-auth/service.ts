import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '../../../cache/redis.service';


export interface JwtPayload {
    sub: string;
    username: string;
    email: string;
    roles: string[];
    iat?: number;
    exp?: number;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly keycloakUrl: string;
    private readonly keycloakRealm: string;
    private readonly keycloakClientId: string;
    private readonly keycloakClientSecret: string;
    private jwksKeys: any[] = [];
    private jwksLastFetch: number = 0;
    private readonly jwksCacheTTL = 3600000; // 1 hour

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) {
        this.keycloakUrl = this.configService.get('KEYCLOAK_URL', 'http://keycloak:8080');
        this.keycloakRealm = this.configService.get('KEYCLOAK_REALM', 'microservices-realm');
        this.keycloakClientId = this.configService.get('KEYCLOAK_CLIENT_ID', 'user-service-client');
        this.keycloakClientSecret = this.configService.get('KEYCLOAK_CLIENT_SECRET', '');
    }

    /**
     * Verify and decode JWT token
     */
    async verifyToken(token: string): Promise<JwtPayload> {
        try {
            // Check if token is blacklisted
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                throw new UnauthorizedException('Token has been revoked');
            }

            // Decode token header to get kid
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string') {
                throw new UnauthorizedException('Invalid token format');
            }

            const kid = decoded.header.kid;
            const publicKey = await this.getPublicKey(kid!);

            // Verify token
            const payload = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
                issuer: `${this.keycloakUrl}/realms/${this.keycloakRealm}`,
                audience: this.keycloakClientId,
            }) as JwtPayload;

            return payload;
        } catch (error: any) {
            this.logger.error(`Token verification failed: ${error.message}`);
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Invalid token');
        }
    }

    /**
     * Validate token payload
     */
    async validateToken(token: string): Promise<{ valid: boolean; payload?: JwtPayload; error?: string }> {
        try {
            const payload = await this.verifyToken(token);
            return { valid: true, payload };
        } catch (error: any) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Introspect token with Keycloak
     */
    async introspectToken(token: string): Promise<any> {
        const axios = require('axios');
        
        try {
            const response = await axios.post(
                `${this.keycloakUrl}/realms/${this.keycloakRealm}/protocol/openid-connect/token/introspect`,
                new URLSearchParams({
                    client_id: this.keycloakClientId,
                    client_secret: this.keycloakClientSecret,
                    token,
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                },
            );

            return response.data;
        } catch (error: any) {
            this.logger.error(`Token introspection failed: ${error.message}`);
            return { active: false };
        }
    }

    /**
     * Blacklist a token (for logout)
     */
    async blacklistToken(token: string, expiresIn: number): Promise<void> {
        const tokenHash = this.hashToken(token);
        await this.redisService.set(`blacklist:${tokenHash}`, true, expiresIn);
    }

    /**
     * Check if token is blacklisted
     */
    private async isTokenBlacklisted(token: string): Promise<boolean> {
        const tokenHash = this.hashToken(token);
        const blacklisted = await this.redisService.get(`blacklist:${tokenHash}`);
        return !!blacklisted;
    }

    /**
     * Hash token for storage
     */
    private hashToken(token: string): string {
        return require('crypto').createHash('sha256').update(token).digest('hex');
    }

    /**
     * Get public key from JWKS
     */
    private async getPublicKey(kid: string): Promise<string> {
        await this.ensureJwksCache();

        const key = this.jwksKeys.find(k => k.kid === kid);
        if (!key) {
            // Force refresh JWKS and try again
            await this.refreshJwks();
            const refreshedKey = this.jwksKeys.find(k => k.kid === kid);
            if (!refreshedKey) {
                throw new UnauthorizedException('Unable to find signing key');
            }
            return this.jwkToPem(refreshedKey);
        }

        return this.jwkToPem(key);
    }

    /**
     * Ensure JWKS cache is valid
     */
    private async ensureJwksCache(): Promise<void> {
        const now = Date.now();
        if (this.jwksKeys.length === 0 || now - this.jwksLastFetch > this.jwksCacheTTL) {
            await this.refreshJwks();
        }
    }

    /**
     * Refresh JWKS keys from Keycloak
     */
    private async refreshJwks(): Promise<void> {
        const axios = require('axios');
        
        try {
            const response = await axios.get(
                `${this.keycloakUrl}/realms/${this.keycloakRealm}/protocol/openid-connect/certs`,
            );

            this.jwksKeys = response.data.keys;
            this.jwksLastFetch = Date.now();
            this.logger.log(`JWKS keys refreshed: ${this.jwksKeys.length} keys loaded`);
        } catch (error: any) {
            this.logger.error(`Failed to fetch JWKS: ${error.message}`);
            throw new UnauthorizedException('Unable to verify token');
        }
    }

    /**
     * Convert JWK to PEM format
     */
    private jwkToPem(jwk: any): string {
        // Simple JWK to PEM conversion for RSA keys
        const modulus = Buffer.from(jwk.n, 'base64');
        const exponent = Buffer.from(jwk.e, 'base64');

        // Build RSA public key in PEM format
        const { createPublicKey } = require('crypto');
        const publicKey = createPublicKey({
            key: {
                kty: 'RSA',
                n: modulus.toString('base64'),
                e: exponent.toString('base64'),
            },
            format: 'jwk',
        });

        return publicKey.export({ type: 'spki', format: 'pem' });
    }
}
