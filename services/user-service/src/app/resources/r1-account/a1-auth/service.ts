import {
    Injectable, Logger, UnauthorizedException,
    ConflictException, BadRequestException,
    NotFoundException,
    OnModuleInit,
    forwardRef,
    Inject,
} from '@nestjs/common';
import { ConfigService }               from '@nestjs/config';
import { createPublicKey, createHash, randomBytes } from 'crypto';
import axios                           from 'axios';
import * as jwt                        from 'jsonwebtoken';
import { RedisService }                from '@app/infra/cache/redis.service';
import { KeycloakAdminService }        from '@app/communications/keycloak/keycloak-admin.service';
import { ProfileService }              from '../a2-profile/service';
import { UserService }                 from '@app/resources/r2-user/service';
import { JwtPayload }                  from '@app/shared/interfaces/jwt-payload.interface';
import { Response }                    from 'express';
import { AUTH_MESSAGE, PROFILE_ERROR_MESSAGE } from '@app/shared/enums/message.enum';
import { Sequelize }                   from 'sequelize';
import { RegisterDto }                 from './dto';
import { ResponseUtil }                from '@app/shared/interfaces/base.interface';
import { InjectConnection, InjectModel }            from '@nestjs/sequelize';
import UserSystemAccess from '@models/user/user-system-access.model';
import UserExternalLinks from '@models/user/user-external-links.model';
import UserSystemRole from '@models/user/user-system-role.model';
import SystemRole from '@models/system/system-role.model';
import System from '@models/system/system.model';
import User from '@models/user/user.model';
import * as jose from 'jose';

// ─── Scoped token payload stored in Redis ────────────────────────────────────
interface ScopedTokenPayload {
    user_id  : string;
    system_id: string;
    type     : 'access' | 'refresh';
    iat      : number;
    exp      : number;
}

// ─── Link session payload (stored in Redis by ProfileService.linkInitiate) ──
interface LinkSessionPayload {
    system_id       : string;
    platform_user_id: string;
    external_id     : string | null;
    step            : 'awaiting_service' | 'confirmed' | 'failed';
    initiated_by    : 'platform' | 'service';
    iat             : number;
    exp             : number;
}

// ─── TTLs ─────────────────────────────────────────────────────────────────────
const SCOPED_ACCESS_TTL  = 900;       // 15 minutes
const SCOPED_REFRESH_TTL = 604_800;   // 7 days

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger           = new Logger(AuthService.name);
    private readonly keycloakUrl      : string;
    private readonly realm            : string;
    private readonly loginClientId    : string;
    private readonly loginClientSecret: string;

    private jwksKeys     : any[]  = [];
    private jwksLastFetch: number = 0;
    private readonly jwksCacheTTL = 3_600_000;

    private readonly internalSecret: string;


    constructor(
        @InjectModel(UserSystemAccess)
        private readonly accessModel            : typeof UserSystemAccess,
        @InjectModel(UserExternalLinks)
        private readonly externalLinksModel     : typeof UserExternalLinks,
        @InjectModel(UserSystemRole)
        private readonly userSystemRoleModel    : typeof UserSystemRole,
        @InjectModel(SystemRole)
        private readonly systemRoleModel        : typeof SystemRole,
        @InjectModel(System)
        private readonly systemModel            : typeof System,
        @InjectModel(User)
        private readonly userModel              : typeof User,
        private readonly configService          : ConfigService,
        private readonly redisService           : RedisService,
        private readonly keycloakAdmin          : KeycloakAdminService,
        private readonly userService            : UserService,
        @Inject(forwardRef(() => ProfileService))
        private readonly profileService         : ProfileService,
        @InjectConnection() private sequelize   : Sequelize,
    ) {
        this.keycloakUrl        = this.configService.get('KEYCLOAK_URL',  'http://keycloak:8080');
        this.realm              = this.configService.get('KEYCLOAK_REALM', 'microservices-platform');
        this.loginClientId      = this.configService.get('KEYCLOAK_LOGIN_CLIENT_ID',     'kong-gateway');
        this.loginClientSecret  = this.configService.get('KEYCLOAK_LOGIN_CLIENT_SECRET', '');
        this.internalSecret = this.configService.get('INTERNAL_SERVICE_SECRET', '');
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    async register(res: Response, body: RegisterDto): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const existingPhone = (await this.userService.findByPhone(body.phone)).data;
            if (existingPhone) {
                throw new ConflictException('លេខទូរស័ព្ទនេះត្រូវបានប្រើប្រាស់រួចហើយ');
            }

            const existingEmail = (await this.userService.findByEmail(body.email)).data;
            if (existingEmail) {
                throw new ConflictException(PROFILE_ERROR_MESSAGE.EMAIL_ALREADY_REGISTERED);
            }

            const user = (await this.userService.create(res, {
                first_name: body.first_name,
                last_name : body.last_name,
                phone     : body.phone,
                email     : body.email,
                is_active : true,
            })).data;

            if (!user.keycloak_id) {
                throw new BadRequestException('Failed to create identity account');
            }

            await this.keycloakAdmin.setPassword(user.keycloak_id, body.password);
            await this.keycloakAdmin.clearRequiredActions(user.keycloak_id);

            try {
                await this.profileService.assignPlatformUserRole(user.id);
            } catch (err: any) {
                this.logger.warn(`Could not assign platform user role: ${err.message}`);
            }

            await tx.commit();
            this.logger.log(`User registered: ${user.id} phone: ${body.phone}`);
            return ResponseUtil.success(res, { success: true }, AUTH_MESSAGE.REGISTRATION_SUCCESS);
        } catch (e) {
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
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

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

    // ─── Platform token refresh ───────────────────────────────────────────────
    // Used by the platform frontend only (Keycloak JWT pair).

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
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

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

    // ─── Platform logout ──────────────────────────────────────────────────────

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
                }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            } catch (err: any) {
                this.logger.warn(`Refresh token revocation failed: ${err.message}`);
            }
        }

        return { success: true };
    }

    // ─── JWKS proxy ───────────────────────────────────────────────────────────

    // async getJwks(): Promise<any> {
    //     const now = Date.now();
    //     if (this.jwksKeys.length && (now - this.jwksLastFetch) < this.jwksCacheTTL) {
    //         return { keys: this.jwksKeys };
    //     }
    //     const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
    //     const { data } = await axios.get(url);
    //     this.jwksKeys      = data.keys;
    //     this.jwksLastFetch = now;
    //     return { keys: this.jwksKeys };
    // }
    async getJwks(): Promise<any> {
        return this.platformJwks;
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
            }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

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

    // ─── Validate scoped token ────────────────────────────────────────────────
    // Called by integrated services via POST /auth/token/validate.
    // The access token is one-time-use — deleted after the first successful call.
    // The service uses the returned user_id to create its own session.
    //
    // Scope enforcement: token.system_id must match the x-system-id header.
    // A token issued for PLT is rejected if service B tries to use it.

    async validateScopedToken(token: string, system_id: string): Promise<{
        valid      : boolean;
        user_id?   : string;
        system_id? : string;
        error?     : string;
    }> {
        try {
            const stored = await this.redisService.get<ScopedTokenPayload>(`scoped_access:${token}`);

            if (!stored) {
                return { valid: false, error: 'Token is invalid or has expired' };
            }
            if (stored.type !== 'access') {
                return { valid: false, error: 'Invalid token type' };
            }
            if (stored.system_id !== system_id) {
                this.logger.warn(
                    `Scoped token scope mismatch: token.system=${stored.system_id} requested=${system_id}`
                );
                return { valid: false, error: 'Token is not valid for this system' };
            }
            // Belt-and-suspenders expiry check (Redis TTL is the primary guard)
            if (stored.exp < Math.floor(Date.now() / 1000)) {
                await this.redisService.del(`scoped_access:${token}`);
                return { valid: false, error: 'Token has expired' };
            }

            // Consume — one-time use prevents replay attacks
            await this.redisService.del(`scoped_access:${token}`);

            this.logger.log(`Scoped token validated: user=${stored.user_id} system=${system_id}`);
            return { valid: true, user_id: stored.user_id, system_id: stored.system_id };
        } catch (err: any) {
            this.logger.error(`Scoped token validation error: ${err.message}`);
            return { valid: false, error: 'Token validation failed' };
        }
    }

    // ─── Refresh scoped token ─────────────────────────────────────────────────
    // Called by integrated services via POST /auth/token/refresh.
    // Rotates the token pair: old refresh deleted, new access + refresh issued.
    // Scope enforcement: refresh_token.system_id must match x-system-id header.

    async refreshScopedToken(refresh_token: string, system_id: string): Promise<{
        access_token : string;
        refresh_token: string;
        expires_in   : number;
        token_type   : string;
    }> {
        const stored = await this.redisService.get<ScopedTokenPayload>(`scoped_refresh:${refresh_token}`);

        if (!stored) {
            throw new UnauthorizedException('Refresh token is invalid or has expired');
        }
        if (stored.type !== 'refresh') {
            throw new UnauthorizedException('Invalid token type');
        }
        if (stored.system_id !== system_id) {
            this.logger.warn(
                `Scoped refresh scope mismatch: token.system=${stored.system_id} requested=${system_id}`
            );
            throw new UnauthorizedException('Token is not valid for this system');
        }
        if (stored.exp < Math.floor(Date.now() / 1000)) {
            await this.redisService.del(`scoped_refresh:${refresh_token}`);
            throw new UnauthorizedException('Refresh token has expired');
        }

        // Rotate: delete old refresh token before issuing new pair
        await this.redisService.del(`scoped_refresh:${refresh_token}`);

        const new_access  = randomBytes(32).toString('hex');
        const new_refresh = randomBytes(32).toString('hex');
        const now         = Math.floor(Date.now() / 1000);

        await Promise.all([
            this.redisService.set(`scoped_access:${new_access}`, {
                user_id  : stored.user_id,
                system_id,
                type     : 'access',
                iat      : now,
                exp      : now + SCOPED_ACCESS_TTL,
            } as ScopedTokenPayload, SCOPED_ACCESS_TTL),

            this.redisService.set(`scoped_refresh:${new_refresh}`, {
                user_id  : stored.user_id,
                system_id,
                type     : 'refresh',
                iat      : now,
                exp      : now + SCOPED_REFRESH_TTL,
            } as ScopedTokenPayload, SCOPED_REFRESH_TTL),
        ]);

        this.logger.log(`Scoped token refreshed: user=${stored.user_id} system=${system_id}`);
        return {
            access_token : new_access,
            refresh_token: new_refresh,
            expires_in   : SCOPED_ACCESS_TTL,
            token_type   : 'Bearer',
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    // B3 FIX (Phase 1): SHA-256 hash — consistent with profile.service.ts logout.
    async blacklistToken(token: string, ttl: number): Promise<void> {
        const hash = createHash('sha256').update(token).digest('hex');
        await this.redisService.set(`blacklist:${hash}`, '1', ttl);
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

    async getLinkSession(code: string): Promise<{
        system_id       : string;
        step            : string;
        initiated_by    : string;
    }> {
        const session = await this.redisService.get<LinkSessionPayload>(`link_session:${code}`);
        if (!session) {
            throw new UnauthorizedException('Link session is invalid or has expired');
        }
        if (session.exp < Math.floor(Date.now() / 1000)) {
            await this.redisService.del(`link_session:${code}`);
            throw new UnauthorizedException('Link session has expired');
        }
 
        // Return only what the frontend needs for the confirmation UI
        return {
            system_id   : session.system_id,
            step        : session.step,
            initiated_by: session.initiated_by,
        };
    }

    async serviceConfirmLink(
        code       : string,
        external_id: string,
        system_id  : string,
        secret     : string,
    ): Promise<{ success: boolean; platform_user_id: string }> {
 
        // ── Verify caller identity ─────────────────────────────────────────────
        // if (!this.internalSecret || secret !== this.internalSecret) {
        //     this.logger.warn(`serviceConfirmLink: invalid secret from system=${system_id}`);
        //     throw new UnauthorizedException('Invalid internal service secret');
        // }
 
        // ── Load and validate session ──────────────────────────────────────────
        const session = await this.redisService.get<LinkSessionPayload>(`link_session:${code}`);
 
        if (!session) {
            throw new UnauthorizedException('Link session is invalid or has expired');
        }
        if (session.step !== 'awaiting_service') {
            throw new BadRequestException(
                session.step === 'confirmed'
                    ? 'Link session has already been confirmed'
                    : 'Link session is in an invalid state'
            );
        }
        if (session.system_id !== system_id) {
            this.logger.warn(
                `serviceConfirmLink: scope mismatch session.system=${session.system_id} caller=${system_id}`
            );
            throw new UnauthorizedException('Link session does not belong to this system');
        }
        if (session.exp < Math.floor(Date.now() / 1000)) {
            await this.redisService.del(`link_session:${code}`);
            throw new UnauthorizedException('Link session has expired');
        }
 
        // ── Mark session as confirmed then delete ──────────────────────────────
        await this.redisService.del(`link_session:${code}`);
        this.logger.log(`Service-confirmed link: user=${session.platform_user_id} system=${system_id}`);
 
        return { success: true, platform_user_id: session.platform_user_id };
    }

    async notifyLink(
        link_session_code: string,
        external_id      : string,
        system_id        : string,
        secret           : string,
    ): Promise<{ success: boolean; redirect_path: string }> {
 
        // ── Secret validation ────────────────────────────────────────────────
        if (!secret || secret !== this.internalSecret) {
            this.logger.warn(`notifyLink: invalid secret from system=${system_id}`);
            throw new UnauthorizedException('Invalid internal service secret');
        }
 
        // ── Session lookup ───────────────────────────────────────────────────
        const session = await this.redisService.get<{
            system_id       : string;
            platform_user_id: string;
            external_id     : string | null;
            step            : string;
            redirect_path   : string;
            exp             : number;
        }>(`link_session:${link_session_code}`);
 
        if (!session) {
            throw new UnauthorizedException('Link session not found or has expired');
        }
 
        // ── Scope: session must belong to the calling system ─────────────────
        if (session.system_id !== system_id) {
            this.logger.warn(
                `notifyLink scope mismatch: session.system=${session.system_id} caller=${system_id}`
            );
            throw new UnauthorizedException('This session does not belong to your system');
        }
 
        // ── Step: must still be waiting for the service ───────────────────────
        if (session.step !== 'awaiting_service') {
            throw new UnauthorizedException('Link session is not in the expected state');
        }
 
        // ── Expiry belt-and-suspenders ────────────────────────────────────────
        if (session.exp < Math.floor(Date.now() / 1000)) {
            await this.redisService.del(`link_session:${link_session_code}`);
            throw new UnauthorizedException('Link session has expired');
        }
 
        // ── Advance session → awaiting_user ───────────────────────────────────
        // Preserve remaining TTL so the user still has time to confirm
        const remaining_ttl = Math.max(session.exp - Math.floor(Date.now() / 1000), 1);
        await this.redisService.set(
            `link_session:${link_session_code}`,
            { ...session, external_id, step: 'awaiting_user' },
            remaining_ttl,
        );
 
        this.logger.log(
            `Link notified: system=${system_id} external=${external_id} code=${link_session_code.substring(0, 8)}...`
        );
        return { success: true, redirect_path: session.redirect_path };
    }

    async ssoCreateLink(
        platform_user_id: string,
        system_id       : string,
        external_id     : string,   // PLT's user ID
    ): Promise<{ success: boolean }> {
 
        const tx = await this.sequelize.transaction();
        try {
            // Find the platform user
            const user = await this.userModel.findOne({ where: { id: platform_user_id } });
            if (!user) throw new NotFoundException('Platform user not found');
 
            const system = await this.systemModel.findOne({ where: { id: system_id, is_active: true } });
            if (!system) throw new BadRequestException('System not found or inactive');
 
            // Idempotent — skip if already connected
            const existing = await this.accessModel.findOne({
                where: { user_id: platform_user_id, system_id },
            });
            if (existing) {
                await tx.rollback();
                return { success: true };
            }
 
            const auto_approve = !system.require_approval;
 
            // Create access record
            await this.accessModel.create({
                user_id            : platform_user_id,
                system_id,
                account_type       : 'internal',
                registration_status: auto_approve ? 'active' : 'pending',
                granted_by         : auto_approve ? platform_user_id : null,
                granted_at         : auto_approve ? new Date() : null,
            } as any, { transaction: tx });
 
            // Create external link (external_id = PLT user ID stored on PLT's side)
            await this.externalLinksModel.create({
                user_id      : platform_user_id,
                system_id,
                external_id,
                external_type: 'internal',
            } as any, { transaction: tx });
 
            // Assign default roles
            if (auto_approve) {
                const defaultRoles = await this.systemRoleModel.findAll({
                    where: { system_id, is_default: true, is_active: true },
                });
 
                for (const role of defaultRoles) {
                    await this.userSystemRoleModel.create({
                        user_id   : platform_user_id,
                        system_id,
                        role_id   : role.id,
                        granted_by: platform_user_id,
                        granted_at: new Date(),
                    } as any, { transaction: tx });
 
                    // Sync Keycloak roles
                    if (user.keycloak_id && role.keycloak_role_name) {
                        try {
                            if (role.role_type === 'realm') {
                                await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                            } else if (system.keycloak_client_id) {
                                await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                            }
                        } catch (err: any) {
                            this.logger.warn(`Keycloak role sync skipped: ${err.message}`);
                        }
                    }
                }
            }
 
            await tx.commit();
            this.logger.log(`SSO link created: platform_user=${platform_user_id} system=${system_id} external=${external_id}`);
            return { success: true };
 
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Add to class field declarations ─────────────────────────────────────────
    private platformPrivateKey: Awaited<ReturnType<typeof jose.generateKeyPair>>['privateKey'] | null = null;
    private platformJwks: { keys: any[] } = { keys: [] };

    // ─── Add to onModuleInit (or constructor body) ────────────────────────────────
    // In production: load from env as base64-encoded PEM.
    // In dev: generate once and log — paste output into .env.
    async onModuleInit() {
        const privateKeyB64 = this.configService.get<string>('PLATFORM_JWT_PRIVATE_KEY');
        const publicKeyB64  = this.configService.get<string>('PLATFORM_JWT_PUBLIC_KEY');

        if (!privateKeyB64 || !publicKeyB64) {
            throw new Error('PLATFORM_JWT_PRIVATE_KEY and PLATFORM_JWT_PUBLIC_KEY must be set in .env');
        }

        const pkcs8 = Buffer.from(privateKeyB64, 'base64').toString('utf8');
        const spki  = Buffer.from(publicKeyB64,  'base64').toString('utf8');

        this.platformPrivateKey = await jose.importPKCS8(pkcs8, 'RS256');
        const publicKey         = await jose.importSPKI(spki, 'RS256');

        this.platformJwks = {
            keys: [{
                ...(await jose.exportJWK(publicKey)),
                kid: 'platform-key-1',
                use: 'sig',
                alg: 'RS256',
            }],
        };

        this.logger.log('Platform JWKS initialized from environment');
    }

    async issueScopedJwtPair(
        platform_user_id: string,
        system_id       : string,
    ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {

        if (!this.platformPrivateKey) throw new Error('Platform key not initialized');

        const access_token = await new jose.SignJWT({ system_id })
            .setProtectedHeader({ alg: 'RS256', kid: 'platform-key-1' })
            .setSubject(platform_user_id)
            .setIssuer('mlmupc-account-system')
            .setAudience(system_id)
            .setIssuedAt()
            .setExpirationTime('15m')
            .sign(this.platformPrivateKey);

        const refresh_token = randomBytes(32).toString('hex');
        await this.redisService.set(
            `scoped_refresh:${refresh_token}`,
            { platform_user_id, system_id },
            7 * 24 * 60 * 60,
        );

        return { access_token, refresh_token, expires_in: 900 };
    }

}