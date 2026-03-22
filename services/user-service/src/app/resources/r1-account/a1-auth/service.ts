import {
    Injectable, Logger, UnauthorizedException,
} from '@nestjs/common';
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
    private readonly loginClientId    : string;
    private readonly loginClientSecret: string;

    private jwksKeys     : any[]  = [];
    private jwksLastFetch: number = 0;
    private readonly jwksCacheTTL = 3_600_000; // 1 hour

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService : RedisService,
    ) {
        this.keycloakUrl       = this.configService.get('KEYCLOAK_URL',  'http://keycloak:8080');
        this.realm             = this.configService.get('KEYCLOAK_REALM', 'microservices-platform');
        this.loginClientId     = this.configService.get('KEYCLOAK_LOGIN_CLIENT_ID',     'kong-gateway');
        this.loginClientSecret = this.configService.get('KEYCLOAK_LOGIN_CLIENT_SECRET', '');
    }

    // ─── Platform login ───────────────────────────────────────────────────────

    async login(phone: string, password: string): Promise<{
        access_token : string;
        refresh_token: string;
        expires_in   : number;
        token_type   : string;
    }> {
        const token_url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

        try {
            const { data } = await axios.post(token_url, new URLSearchParams({
                grant_type   : 'password',
                client_id    : this.loginClientId,
                client_secret: this.loginClientSecret,
                username     : phone,
                password,
                scope        : 'openid profile email',
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            this.logger.log(`Platform login: ${phone}`);

            return {
                access_token : data.access_token,
                refresh_token: data.refresh_token,
                expires_in   : data.expires_in,
                token_type   : data.token_type,
            };
        } catch (err: any) {
            const status = err.response?.status;
            if (status === 401) throw new UnauthorizedException('Invalid phone or password');
            if (status === 400) throw new UnauthorizedException('Invalid login request');
            this.logger.error(`Keycloak login error: ${err.message}`);
            throw new UnauthorizedException('Login failed');
        }
    }

    // ─── Refresh token ────────────────────────────────────────────────────────

    async refresh(refresh_token: string): Promise<{
        access_token : string;
        refresh_token: string;
        expires_in   : number;
        token_type   : string;
    }> {
        const token_url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;

        try {
            const { data } = await axios.post(token_url, new URLSearchParams({
                grant_type   : 'refresh_token',
                client_id    : this.loginClientId,
                client_secret: this.loginClientSecret,
                refresh_token,
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            return {
                access_token : data.access_token,
                refresh_token: data.refresh_token,
                expires_in   : data.expires_in,
                token_type   : data.token_type,
            };
        } catch (err: any) {
            if (err.response?.status === 400) {
                throw new UnauthorizedException('Refresh token is invalid or expired');
            }
            throw new UnauthorizedException('Token refresh failed');
        }
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    async logout(access_token: string, refresh_token?: string): Promise<{ success: boolean }> {
        try {
            const decoded = jwt.decode(access_token) as any;
            const ttl     = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86_400;
            await this.blacklistToken(access_token, Math.max(ttl, 0));
        } catch {
            // Non-critical
        }

        if (refresh_token) {
            const revoke_url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/revoke`;
            try {
                await axios.post(revoke_url, new URLSearchParams({
                    client_id      : this.loginClientId,
                    client_secret  : this.loginClientSecret,
                    token          : refresh_token,
                    token_type_hint: 'refresh_token',
                }), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
            } catch (err: any) {
                this.logger.warn(`Refresh token revocation failed: ${err.message}`);
            }
        }

        return { success: true };
    }

    // ─── JWKS proxy ───────────────────────────────────────────────────────────
    // External systems fetch Keycloak public keys here to verify tokens.
    // They never need to know Keycloak's URL.

    async getJwks(): Promise<any> {
        try {
            const { data } = await axios.get(
                `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`
            );
            return data;
        } catch (err: any) {
            this.logger.error(`Failed to fetch JWKS: ${err.message}`);
            throw new UnauthorizedException('Unable to fetch public keys');
        }
    }

    // ─── Token verification (used by JwtStrategy + gRPC) ─────────────────────

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
                issuer    : `${this.keycloakUrl}/realms/${this.realm}`,
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

    async exchangeCodeForToken(code: string): Promise<{
        access_token : string;
        refresh_token: string;
        expires_in   : number;
        token_type   : string;
    }> {
        const token_url    = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
        const redirect_uri = 'http://localhost:4444/callback';

        try {
            const { data } = await axios.post(token_url, new URLSearchParams({
                grant_type   : 'authorization_code',
                client_id    : this.loginClientId,
                client_secret: this.loginClientSecret,
                code,
                redirect_uri,
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            return {
                access_token : data.access_token,
                refresh_token: data.refresh_token,
                expires_in   : data.expires_in,
                token_type   : data.token_type,
            };
        } catch (err: any) {
            console.log(err)
            this.logger.error(`Code exchange failed: ${err.response?.data?.error_description || err.message}`);
            throw new UnauthorizedException('Login failed');
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async isTokenBlacklisted(token: string): Promise<boolean> {
        const hash        = this.hashToken(token);
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
        } catch (error: any) {
            this.logger.error(`Failed to fetch JWKS: ${error.message}`);
            throw new UnauthorizedException('Unable to verify token');
        }
    }

    private jwkToPem(jwk: any): string {
        const publicKey = createPublicKey({
            key   : { kty: 'RSA', n: jwk.n, e: jwk.e },
            format: 'jwk',
        });
        return publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }
}