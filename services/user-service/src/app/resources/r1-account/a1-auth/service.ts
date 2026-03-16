import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createPublicKey } from 'crypto';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { RedisService } from '@app/infra/cache/redis.service';
import { JwtPayload } from '@app/shared/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
    private readonly logger       = new Logger(AuthService.name);
    private readonly keycloakUrl  : string;
    private readonly realm        : string;
    private readonly clientId     : string;

    private jwksKeys     : any[]  = [];
    private jwksLastFetch: number = 0;
    private readonly jwksCacheTTL = 3_600_000; // 1 hour ms

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) {
        this.keycloakUrl = this.configService.get('KEYCLOAK_URL',    'http://keycloak:8080');
        this.realm       = this.configService.get('KEYCLOAK_REALM',  'microservices-platform');
        this.clientId    = this.configService.get('KEYCLOAK_CLIENT_ID', '');
    }

    // ─────────────────────────────────────────
    //  Public API
    // ─────────────────────────────────────────

    async verifyToken(token: string): Promise<JwtPayload> {
        const isBlacklisted = await this.isTokenBlacklisted(token);
        if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');

        try {
            const decoded = jwt.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string') {
                throw new UnauthorizedException('Invalid token format');
            }

            const publicKey = await this.getPublicKey(decoded.header.kid!);

            const payload = jwt.verify(token, publicKey, {
                algorithms: ['RS256'],
                issuer:     `${this.keycloakUrl}/realms/${this.realm}`,
            }) as JwtPayload;

            return payload;
        } catch (error: any) {
            this.logger.error(`Token verification failed: ${error.message}`);
            if (error instanceof UnauthorizedException) throw error;
            throw new UnauthorizedException('Invalid token');
        }
    }

    async validateToken(token: string): Promise<{ valid: boolean; payload?: JwtPayload; error?: string }> {
        try {
            const payload = await this.verifyToken(token);
            return { valid: true, payload };
        } catch (error: any) {
            return { valid: false, error: error.message };
        }
    }

    async blacklistToken(token: string, expiresIn: number): Promise<void> {
        const hash = this.hashToken(token);
        await this.redisService.set(`blacklist:${hash}`, true, expiresIn);
    }

    // ─────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────

    private async isTokenBlacklisted(token: string): Promise<boolean> {
        const hash       = this.hashToken(token);
        const blacklisted = await this.redisService.get(`blacklist:${hash}`);
        return !!blacklisted;
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async getPublicKey(kid: string): Promise<string> {
        await this.ensureJwksCache();

        let key = this.jwksKeys.find(k => k.kid === kid);
        if (!key) {
            await this.refreshJwks();
            key = this.jwksKeys.find(k => k.kid === kid);
        }

        if (!key) throw new UnauthorizedException('Unable to find signing key');
        return this.jwkToPem(key);
    }

    private async ensureJwksCache(): Promise<void> {
        if (this.jwksKeys.length > 0 && Date.now() - this.jwksLastFetch < this.jwksCacheTTL) return;
        await this.refreshJwks();
    }

    private async refreshJwks(): Promise<void> {
        try {
            const { data } = await axios.get(
                `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`,
            );
            this.jwksKeys      = data.keys;
            this.jwksLastFetch = Date.now();
            this.logger.log(`JWKS refreshed: ${this.jwksKeys.length} keys`);
        } catch (error: any) {
            this.logger.error(`Failed to fetch JWKS: ${error.message}`);
            throw new UnauthorizedException('Unable to verify token');
        }
    }

    private jwkToPem(jwk: any): string {
        const publicKey = createPublicKey({
            key:    { kty: 'RSA', n: jwk.n, e: jwk.e },
            format: 'jwk',
        });
        return publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }
}