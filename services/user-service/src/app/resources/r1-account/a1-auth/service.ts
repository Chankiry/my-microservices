import {
    Injectable, Logger, UnauthorizedException,
    ConflictException, BadRequestException,
} from '@nestjs/common';
import { ConfigService }    from '@nestjs/config';
import { createPublicKey }  from 'crypto';
import axios                from 'axios';
import * as jwt             from 'jsonwebtoken';
import { RedisService }     from '@app/infra/cache/redis.service';
import { KeycloakAdminService } from '@app/communications/keycloak/keycloak-admin.service';
import { ProfileService }  from '../a2-profile/service';
import { UserService }      from '@app/resources/r2-user/service';
import { JwtPayload } from '@app/shared/interfaces/jwt-payload.interface';
import { Response } from 'express';
import { AUTH_MESSAGE, PROFILE_ERROR_MESSAGE } from '@app/shared/enums/message.enum';
import { Sequelize } from 'sequelize';
import { RegisterDto } from './dto';
import { ResponseUtil } from '@app/shared/interfaces/base.interface';
import { InjectConnection } from '@nestjs/sequelize';

@Injectable()
export class AuthService {
    private readonly logger           = new Logger(AuthService.name);
    private readonly keycloakUrl      : string;
    private readonly realm            : string;
    private readonly loginClientId    : string;
    private readonly loginClientSecret: string;

    private jwksKeys     : any[]  = [];
    private jwksLastFetch: number = 0;
    private readonly jwksCacheTTL = 3_600_000;

    constructor(
        private readonly configService  : ConfigService,
        private readonly redisService   : RedisService,
        private readonly keycloakAdmin  : KeycloakAdminService,
        private readonly userService    : UserService,
        private readonly profileService : ProfileService,
        @InjectConnection() private sequelize: Sequelize,
        
    ) {
        this.keycloakUrl        = this.configService.get('KEYCLOAK_URL',  'http://keycloak:8080');
        this.realm              = this.configService.get('KEYCLOAK_REALM', 'microservices-platform');
        this.loginClientId      = this.configService.get('KEYCLOAK_LOGIN_CLIENT_ID',     'kong-gateway');
        this.loginClientSecret  = this.configService.get('KEYCLOAK_LOGIN_CLIENT_SECRET', '');
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    async register(
        res: Response,
        body: RegisterDto
    ): Promise<any> {
        const tx = await this.sequelize.transaction();
        try{
            // Check phone uniqueness
            const existingPhone = (await this.userService.findByPhone(body.phone)).data;
            if (existingPhone) {
                throw new ConflictException('លេខទូរស័ព្ទនេះត្រូវបានប្រើប្រាស់រួចហើយ');
            }
    
            // Check email uniqueness
            const existingEmail = (await this.userService.findByEmail(body.email)).data;
            if (existingEmail) {
                throw new ConflictException(PROFILE_ERROR_MESSAGE.EMAIL_ALREADY_REGISTERED);
            }
    
            // Create user in DB + Keycloak (without password — set separately)
            const user = (await this.userService.create(
                res,
                {
                    first_name : body.first_name,
                    last_name  : body.last_name,
                    phone      : body.phone,
                    email      : body.email,
                    is_active  : true,
                }
            )).data;
    
            if (!user.keycloak_id) {
                throw new BadRequestException('Failed to create identity account');
            }
    
            // Set password and clear required actions
            await this.keycloakAdmin.setPassword(user.keycloak_id, body.password);
            await this.keycloakAdmin.clearRequiredActions(user.keycloak_id);
    
            // Assign the default platform 'user' role in user_system_roles
            // so the /me endpoint returns the correct platform_roles[]
            try {
                await this.profileService.assignPlatformUserRole(user.id);
            } catch (err: any) {
                this.logger.warn(`Could not assign platform user role: ${err.message}`);
            }

            await tx.commit();
    
            this.logger.log(`User registered: ${user.id} phone: ${body.phone}`);
    
            return ResponseUtil.success(res, { success: true }, AUTH_MESSAGE.REGISTRATION_SUCCESS);
        } catch(e){
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
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
            if (status === 401) throw new UnauthorizedException('លេខទូរស័ព្ទ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
            if (status === 400) throw new UnauthorizedException('Invalid login request');
            this.logger.error(`Keycloak login error: ${err.message}`);
            throw new UnauthorizedException('Login failed');
        }
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

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
        } catch { /* non-critical */ }

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

    async getJwks(): Promise<any> {
        const now = Date.now();
        if (this.jwksKeys.length && (now - this.jwksLastFetch) < this.jwksCacheTTL) {
            return { keys: this.jwksKeys };
        }

        const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
        const { data } = await axios.get(url);
        this.jwksKeys      = data.keys;
        this.jwksLastFetch = now;
        return { keys: this.jwksKeys };
    }

    // ─── OAuth2 code exchange ─────────────────────────────────────────────────

    async exchangeCodeForToken(code: string): Promise<any> {
        const token_url   = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
        const redirectUri = this.configService.get('OAUTH2_REDIRECT_URI', 'http://localhost:4200/callback');

        try {
            const { data } = await axios.post(token_url, new URLSearchParams({
                grant_type   : 'authorization_code',
                client_id    : this.loginClientId,
                client_secret: this.loginClientSecret,
                code,
                redirect_uri : redirectUri,
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
            this.logger.error(`Code exchange failed: ${err.response?.data?.error_description || err.message}`);
            throw new UnauthorizedException('Authorization code exchange failed');
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    async blacklistToken(token: string, ttl: number): Promise<void> {
        const key = `blacklist:${token.substring(token.length - 20)}`;
        await this.redisService.set(key, '1', ttl);
    }

    async verifyToken(token: string): Promise<any> {
        const keys = await this.getJwks();
        for (const key of keys.keys) {
            try {
                const pub = createPublicKey({ key, format: 'jwk' });
                return jwt.verify(token, pub, { algorithms: ['RS256'] });
            } catch { /* try next key */ }
        }
        throw new UnauthorizedException('Token verification failed');
    }
    
    async validateToken(token: string): Promise<{ valid: boolean; payload?: JwtPayload; error?: string }> {
        try {
            const payload = await this.verifyToken(token);
            return { valid: true, payload };
        } catch (error: any) {
            return { valid: false, error: error.message };
        }
    }
}