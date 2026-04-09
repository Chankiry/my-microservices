import {
    Injectable, Logger, UnauthorizedException,
    NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize }                 from 'sequelize';
import { createHash, randomBytes }                    from 'crypto';
import axios                             from 'axios';
import { KeycloakAdminService }  from '../../../communications/keycloak/keycloak-admin.service';
import { RedisService }          from '@app/infra/cache/redis.service';
import {
    UpdateProfileDto, ConnectSystemDto,
    ChangePasswordDto, ChangeEmailDto, ChangePhoneDto,
    LinkInitiateDto,
    ServiceInitiatedConfirmDto,
    LinkConfirmDto,
} from './dto';
import { UserService }      from '@app/resources/r2-user/service';
import { SystemService }    from '@app/resources/r4-systems/service';
import UserSystemAccess     from '../../../../models/user/user-system-access.model';
import UserExternalLinks    from '../../../../models/user/user-external-links.model';
import UserSystemRole       from '../../../../models/user/user-system-role.model';
import SystemRole           from '../../../../models/system/system-role.model';
import System               from '../../../../models/system/system.model';
import { Response }         from 'express';
import { ResponseUtil }     from '@app/shared/interfaces/base.interface';
import {
    AUTH_ERROR_MESSAGE,
    ERROR_MESSAGE,
    PROFILE_ERROR_MESSAGE,
    PROFILE_MESSAGE,
    SYSTEM_ERROR_MESSAGE,
    SYSTEM_MESSAGE,
} from '@app/shared/enums/message.enum';
import {
    CustomCreateOptions,
    CustomDestroyOptions,
    CustomUpdateOptions,
} from '@app/shared/interfaces/custom-option.interface';
import { ConfigService } from '@nestjs/config';
import {
    UserSystemAccessAccountTypeEnum,
    UserSystemAccessRegistrationStatusEnum,
} from '@app/shared/enums/System.enum';
import { AuthService } from '../a1-auth/service';

interface LinkSessionPayload {
    system_id       : string;
    platform_user_id: string;
    external_id     : string | null;  // filled by the service via /auth/link/notify
    step            : 'awaiting_service' | 'awaiting_user';
    redirect_path   : string;         // frontend route after confirm, e.g. '/user/home'
    iat             : number;
    exp             : number;
}
 
const LINK_SESSION_TTL = 600; // 10 minutes

@Injectable()
export class ProfileService {
    private readonly logger    = new Logger(ProfileService.name);
    private readonly system_id : string;

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
        private readonly userService            : UserService,
        private readonly systemService          : SystemService,
        private readonly keycloakAdmin          : KeycloakAdminService,
        private readonly redisService           : RedisService,
        @InjectConnection()
        private readonly sequelize              : Sequelize,
        private readonly configService          : ConfigService,
        private readonly authService            : AuthService,
    ) {
        this.system_id = this.configService.get('SYSTEM_ID', 'mlmupc-account-system');
    }

    // ─── GET /profile/me ─────────────────────────────────────────────────────
    // Lightweight — returns user fields + platform roles only.

    async getMe(res: Response, keycloak_id: string) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const userRoles = await this.userSystemRoleModel.findAll({
                where  : { user_id: user.id, system_id: this.system_id },
                include: [{ model: SystemRole, as: 'role' }],
                order  : [['created_at', 'ASC']],
            });

            const data = {
                id        : user.id,
                avatar    : user.avatar,
                cover     : user.cover,
                first_name: user.first_name,
                last_name : user.last_name,
                name_kh   : user.name_kh,
                name_en   : user.name_en,
                email     : user.email,
                phone     : user.phone,
                roles: userRoles.map(ur => ({
                    id     : ur.role.id,
                    slug   : ur.role.slug,
                    name_kh: ur.role.name_kh,
                    name_en: ur.role.name_en,
                    icon   : ur.role.icon,
                    color  : ur.role.color,
                })),
            };

            return ResponseUtil.success(res, data);
        } catch (e) {
            if (e instanceof NotFoundException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── GET /profile ─────────────────────────────────────────────────────────
    // Full profile — user + all connected systems + roles per system.

    async getProfile(res: Response, keycloak_id: string) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const systems = await this.systemModel.findAll({
                where: { id: { [Op.ne]: this.system_id } },
                include: [
                    {
                        model   : UserSystemAccess,
                        as      : 'access_users',
                        where   : { user_id: user.id },
                        required: true,
                    },
                    {
                        model  : SystemRole,
                        as     : 'roles',
                        include: [{
                            model   : UserSystemRole,
                            as      : 'user_system_roles',
                            where   : { user_id: user.id },
                            required: true,
                        }],
                    },
                ],
                order: [['created_at', 'ASC']],
            });

            const data = {
                id        : user.id,
                avatar    : user.avatar,
                cover     : user.cover,
                first_name: user.first_name,
                last_name : user.last_name,
                name_kh   : user.name_kh,
                name_en   : user.name_en,
                email     : user.email,
                phone     : user.phone,
                system_accesses: systems.map(s => ({
                    id                 : s.id,
                    name_kh            : s.name_kh,
                    name_en            : s.name_en,
                    logo               : s.logo,
                    cover              : s.cover,
                    base_url           : s.base_url,
                    registration_status: s.access_users[0].registration_status,
                    roles: s.roles.map(r => ({
                        id     : r.id,
                        slug   : r.slug,
                        name_kh: r.name_kh,
                        name_en: r.name_en,
                        icon   : r.icon,
                        color  : r.color,
                    })),
                })),
            };

            return ResponseUtil.success(res, data);
        } catch (e) {
            if (e instanceof NotFoundException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Update Profile ───────────────────────────────────────────────────────

    async updateProfile(res: Response, keycloak_id: string, body: UpdateProfileDto) {
        const tx = await this.accessModel.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const nameChanged =
                (body.first_name !== undefined && body.first_name !== user.first_name) ||
                (body.last_name  !== undefined && body.last_name  !== user.last_name);

            if (nameChanged && user.keycloak_id) {
                const new_first = body.first_name ?? user.first_name ?? '';
                const new_last  = body.last_name  ?? user.last_name  ?? '';
                try {
                    await this.keycloakAdmin.updateName(user.keycloak_id, new_first, new_last);
                } catch (err: any) {
                    this.logger.warn(`Keycloak name sync failed: ${err.message}`);
                }
            }

            Object.assign(user, body);
            await user.save({ transaction: tx, user_id: user.id } as CustomUpdateOptions<typeof user>);
            await tx.commit();

            await this.redisService.del(`user:keycloak:${keycloak_id}`);
            await this.redisService.del(`user:profile:${user.id}`);

            return ResponseUtil.success(res, user, PROFILE_MESSAGE.UPDATE_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Change Password ──────────────────────────────────────────────────────

    async changePassword(res: Response, keycloak_id: string, body: ChangePasswordDto) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user?.keycloak_id) throw new BadRequestException(PROFILE_ERROR_MESSAGE.NOT_LINKED_TO_IDP);
            await this.keycloakAdmin.setPassword(user.keycloak_id, body.new_password);
            await tx.commit();
            return ResponseUtil.success(res, { success: true }, PROFILE_MESSAGE.CHANGE_PASSWORD_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Change Email ─────────────────────────────────────────────────────────

    async changeEmail(res: Response, keycloak_id: string, body: ChangeEmailDto) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user?.keycloak_id) throw new BadRequestException(PROFILE_ERROR_MESSAGE.NOT_LINKED_TO_IDP);
            await this.keycloakAdmin.setEmail(user.keycloak_id, body.new_email);
            await this.userService.updateMirrorFields(user.id, { email: body.new_email });
            await tx.commit();
            return ResponseUtil.success(res, { success: true }, PROFILE_MESSAGE.CHANGE_EMAIL_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Change Phone ─────────────────────────────────────────────────────────

    async changePhone(res: Response, keycloak_id: string, body: ChangePhoneDto) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user?.keycloak_id) throw new BadRequestException(PROFILE_ERROR_MESSAGE.NOT_LINKED_TO_IDP);
            await this.keycloakAdmin.updateUsername(user.keycloak_id, body.new_phone);
            await this.userService.updatePhone(user.id, body.new_phone);
            await tx.commit();
            return ResponseUtil.success(res, { success: true }, PROFILE_MESSAGE.CHANGE_PHONE_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Get Available Systems ────────────────────────────────────────────────

    async getAvailableSystems(res: Response, keycloak_id: string) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const connected = await this.accessModel.findAll({
                where     : { user_id: user.id },
                attributes: ['system_id'],
            });
            const connected_ids = connected.map(a => a.system_id);

            const systems = await System.findAll({
                where: {
                    id       : { [Op.notIn]: [...connected_ids, this.system_id] },
                    is_active: true,
                },
                order: [['created_at', 'ASC']],
            });

            return ResponseUtil.success(res, systems);
        } catch (e) {
            if (e instanceof NotFoundException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Connect System ───────────────────────────────────────────────────────
    // B4 FIX: all creates now pass { transaction: tx, user_id } as CustomCreateOptions.
    // BaseModel hook reads options.user_id and sets creator_id + updater_id automatically.

    async connectSystem(res: Response, keycloak_id: string, body: ConnectSystemDto) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const system = await this.systemService.findById(body.system_id);
            if (!system)           throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_FOUND);
            if (!system.is_active) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_INACTIVE);

            const existing = await this.accessModel.findOne({
                where: { user_id: user.id, system_id: body.system_id },
            });
            if (existing) throw new ConflictException(SYSTEM_ERROR_MESSAGE.SYSTEM_ALREADY_CONNECTED);

            if (!system.auth_callback_url) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_ALLOW_CONNECTION);
            }

            let external_id: string;
            try {
                const { data } = await axios.post(system.auth_callback_url, {
                    username: body.username,
                    password: body.password,
                }, { timeout: 10_000 });

                if (!data?.valid) throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIALS);
                external_id = String(data.external_id || data.user_id || data.id);
            } catch (err: any) {
                if (err?.response?.status === 401 || err instanceof UnauthorizedException) {
                    throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIALS);
                }
                this.logger.error(`System auth callback failed: ${err.message}`);
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.CONNECTION_FAILED);
            }

            const defaultRoles = await this.systemService.findDefaultRoles(body.system_id);
            const auto_approve = !system.require_approval;

            const access = await this.accessModel.create(
                {
                    user_id            : user.id,
                    system_id          : body.system_id,
                    account_type       : UserSystemAccessAccountTypeEnum.INTERNAL,
                    registration_status: auto_approve
                        ? UserSystemAccessRegistrationStatusEnum.ACTIVE
                        : UserSystemAccessRegistrationStatusEnum.PENDING,
                    granted_by: auto_approve ? user.id  : null,
                    granted_at: auto_approve ? new Date() : null,
                } as any,
                { transaction: tx, user_id: user.id } as CustomCreateOptions<UserSystemAccess>,
            );

            // B4 FIX: was missing { transaction: tx, user_id }
            await this.externalLinksModel.create(
                {
                    user_id      : user.id,
                    system_id    : body.system_id,
                    external_id,
                    external_type: 'internal',
                } as any,
                { transaction: tx, user_id: user.id } as CustomCreateOptions<UserExternalLinks>,
            );

            if (auto_approve && defaultRoles.length) {
                for (const role of defaultRoles) {
                    // B4 FIX: was missing { transaction: tx, user_id }
                    await this.userSystemRoleModel.create(
                        {
                            user_id   : user.id,
                            system_id : body.system_id,
                            role_id   : role.id,
                            granted_by: user.id,
                            granted_at: new Date(),
                        } as any,
                        { transaction: tx, user_id: user.id } as CustomCreateOptions<UserSystemRole>,
                    );

                    if (user.keycloak_id && role.keycloak_role_name) {
                        try {
                            if (role.role_type === 'realm') {
                                await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                            } else if (system.keycloak_client_id) {
                                await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                            }
                        } catch (err: any) {
                            this.logger.warn(`Keycloak role sync failed for '${role.slug}': ${err.message}`);
                        }
                    }
                }
            }

            await tx.commit();
            this.logger.log(`System connected: user=${user.id} system=${body.system_id}`);
            return ResponseUtil.success(res, access, SYSTEM_MESSAGE.CONNECT_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException || e instanceof ConflictException ||
                e instanceof UnauthorizedException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Disconnect System ────────────────────────────────────────────────────
    // Uses CustomDestroyOptions — BeforeDestroy hook sets deleter_id automatically.

    async disconnectSystem(res: Response, keycloak_id: string, system_id: string): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const access = await this.accessModel.findOne({
                where: { user_id: user.id, system_id },
            });
            if (!access) throw new NotFoundException(SYSTEM_ERROR_MESSAGE.ACCESS_NOT_FOUND);

            const system = await this.systemService.findById(system_id);

            const userRoles = await this.userSystemRoleModel.findAll({
                where  : { user_id: user.id, system_id },
                include: [{ model: SystemRole, as: 'role' }],
            });

            for (const ur of userRoles) {
                if (user.keycloak_id && ur.role?.keycloak_role_name) {
                    try {
                        if (ur.role.role_type === 'realm') {
                            await this.keycloakAdmin.revokeRealmRole(user.keycloak_id, ur.role.keycloak_role_name);
                        } else if (system.keycloak_client_id) {
                            await this.keycloakAdmin.revokeClientRole(user.keycloak_id, system.keycloak_client_id, ur.role.keycloak_role_name);
                        }
                    } catch (err: any) {
                        this.logger.warn(`Keycloak role revoke failed: ${err.message}`);
                    }
                }
                // BeforeDestroy hook sets ur.deleter_id = user.id and saves before soft-delete
                await ur.destroy({ transaction: tx, user_id: user.id } as CustomDestroyOptions);
            }

            // UserExternalLinks has no paranoid — hard delete
            await this.externalLinksModel.destroy({ where: { user_id: user.id, system_id } });

            // BeforeDestroy hook sets access.deleter_id = user.id and saves before soft-delete
            await access.destroy({ transaction: tx, user_id: user.id } as CustomDestroyOptions);

            await tx.commit();
            this.logger.log(`System disconnected: user=${user.id} system=${system_id}`);

            // B2 FIX: was SYSTEM_ERROR_MESSAGE.SYSTEM_DISCONNECTION_FAILED (error key on success path)
            return ResponseUtil.success(res, { success: true }, SYSTEM_MESSAGE.DISCONNECT_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Assign Platform User Role ────────────────────────────────────────────

    async assignPlatformUserRole(user_id: string): Promise<void> {
        const platformUserRole = await this.systemRoleModel.findOne({
            where: { system_id: this.system_id, slug: 'user', is_active: true },
        });
        if (!platformUserRole) {
            this.logger.warn('Platform user role not found — skipping assignment');
            return;
        }

        const existing = await this.userSystemRoleModel.findOne({
            where: { user_id, role_id: platformUserRole.id },
        });
        if (existing) return;

        // user_id is the parameter — shorthand is valid here
        await this.userSystemRoleModel.create(
            {
                user_id,
                system_id : this.system_id,
                role_id   : platformUserRole.id,
                granted_by: user_id,
                granted_at: new Date(),
            } as any,
            { user_id } as CustomCreateOptions<UserSystemRole>,
        );

        this.logger.log(`Platform user role assigned: user=${user_id}`);
    }

    // ─── SSO Navigate ─────────────────────────────────────────────────────────

    async getSsoNavigateUrl(res: Response, keycloak_id: string, system_id: string, access_token: string) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
 
            const access = await this.accessModel.findOne({
                where: { user_id: user.id, system_id, registration_status: 'active' },
            });
            if (!access) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.ACCESS_DENIED);
 
            const system = await this.systemService.findById(system_id);
            if (!system.base_url) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.NO_BASE_URL);
 
            // ── Keycloak-client system — issue scoped token (NOT raw Keycloak JWT) ──
            if (system.keycloak_client_id) {
                const tokens = await this.issueScopedTokenPair(user.id, system_id);
                const data   = { url: `${system.base_url}?platform_token=${encodeURIComponent(tokens.access_token)}` };
                return ResponseUtil.success(res, data);
            }
 
            // ── External system — server-side token exchange ───────────────────────
            if (system.auth_callback_url) {
                try {
                    const sso_url  = system.auth_callback_url.replace('/auth/validate', '/auth/sso');
                    const { data } = await axios.post(sso_url, {
                        platform_user_id: user.id,
                        platform_token  : access_token,
                    }, { timeout: 10_000 });
 
                    const system_token = data.token || data.access_token;
                    if (!system_token) throw new Error('No token in SSO response');
                    const responseData = { url: `${system.base_url}?token=${encodeURIComponent(system_token)}` };
                    return ResponseUtil.success(res, responseData);
                } catch (err: any) {
                    this.logger.error(`SSO exchange failed: ${err.message}`);
                    throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SSO_FAILED);
                }
            }
 
            throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SSO_NOT_SUPPORTED);
        } catch (e) {
            if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Redirect Login Validation ────────────────────────────────────────────

 
    async validateRedirectLogin(
        res          : Response,
        keycloak_id  : string,
        system_id    : string,
        redirect_uri : string,
        action       : 'login' | 'link',
        access_token : string,
    ): Promise<any> {
        try {
            let responseData: any = {};
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
    
            const system = await this.systemService.findById(system_id);
            if (!system)           throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_FOUND);
            if (!system.is_active) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_INACTIVE);
    
            // Validate redirect_uri matches registered base_url
            if (system.base_url) {
                const registered = new URL(system.base_url);
                const provided   = new URL(redirect_uri);
                if (registered.origin !== provided.origin) {
                    throw new BadRequestException(SYSTEM_ERROR_MESSAGE.INVALID_REDIRECT_URI);
                }
            }
    
            if (action === 'login') {
                // ── REMOVED: access check ──────────────────────────────────────────
                // We no longer require an existing user_system_access record here.
                // The platform proves the user is authenticated; PLT decides what
                // to do with the token (login if linked, or show connect-required).
                // ──────────────────────────────────────────────────────────────────
    
                // Issue scoped JWT pair for keycloak_client_id systems
                if (system.keycloak_client_id) {
                    const { access_token: scoped_token } = await this.authService.issueScopedJwtPair(
                        user.id, system_id,
                    );
                    const sep = redirect_uri.includes('?') ? '&' : '?';
                    responseData = {
                        redirect_url: `${redirect_uri}${sep}platform_token=${encodeURIComponent(scoped_token)}`,
                    };
                    return ResponseUtil.success(res, responseData);
                }
    
                // For non-keycloak systems — one-time code exchange (unchanged)
                if (system.auth_callback_url) {
                    const one_time_code = randomBytes(16).toString('hex');
                    await this.redisService.set(
                        `redirect_code:${one_time_code}`,
                        { user_id: user.id, system_id, access_token },
                        300,
                    );
                    const sep = redirect_uri.includes('?') ? '&' : '?';
                    responseData = {
                        redirect_url: `${redirect_uri}${sep}code=${one_time_code}`,
                    };
                    return ResponseUtil.success(res, responseData);
                }
    
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SSO_NOT_SUPPORTED);
            }
    
            // action === 'link' — existing link flow (unchanged)
            // ...
            throw new BadRequestException('Link action not handled here');
    
        } catch (e) {
            if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Exchange redirect code for token ─────────────────────────────────────

    async exchangeRedirectCode(code: string): Promise<{
        access_token: string;
        user_id     : string;
        system_id   : string;
    }> {
        const key  = `redirect:code:${code}`;
        const data = await this.redisService.get<{
            token    : string;
            user_id  : string;
            system_id: string;
        }>(key);

        if (!data) throw new UnauthorizedException('Code is invalid or has expired');

        await this.redisService.del(key);
        this.logger.log(`Redirect code exchanged: user=${data.user_id} system=${data.system_id}`);

        return { access_token: data.token, user_id: data.user_id, system_id: data.system_id };
    }

    // ─── Redirect Link Account ────────────────────────────────────────────────
    // B5 FIX: all creates inside tx now pass { transaction: tx, user_id: user.id }.
    // B5 FIX: user_id shorthand replaced with user_id: user.id (user_id not in scope as variable).

    async redirectLinkAccount(
        res         : Response,
        keycloak_id : string,
        system_id   : string,
        redirect_uri: string,
        username    : string,
        password    : string,
    ): Promise<any> {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);

            const system = await this.systemService.findById(system_id);
            if (!system.base_url) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.NO_REDIRECT_URL);
            if (!redirect_uri.replace(/\/+$/, '').startsWith(system.base_url.replace(/\/+$/, ''))) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.INVALID_REDIRECT_URI);
            }

            const existing = await this.accessModel.findOne({ where: { user_id: user.id, system_id } });
            if (existing) {
                await tx.rollback();
                const sep  = redirect_uri.includes('?') ? '&' : '?';
                const data = { redirect_url: `${redirect_uri}${sep}linked=true&platform_user_id=${user.id}&already_linked=true` };
                return ResponseUtil.success(res, data);
            }

            if (!system.auth_callback_url) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_ALLOW_CONNECTION);
            }

            let external_id: string;
            try {
                const { data } = await axios.post(system.auth_callback_url, { username, password }, { timeout: 10_000 });
                if (!data?.valid) throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIALS);
                external_id = String(data.external_id || data.user_id || data.id);
            } catch (err: any) {
                if (err instanceof UnauthorizedException) throw err;
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.CONNECTION_FAILED);
            }

            const defaultRoles = await this.systemService.findDefaultRoles(system_id);
            const auto_approve = !system.require_approval;

            // B5 FIX: added { transaction: tx, user_id: user.id }
            await this.accessModel.create(
                {
                    user_id            : user.id,
                    system_id,
                    account_type       : UserSystemAccessAccountTypeEnum.INTERNAL,
                    registration_status: auto_approve
                        ? UserSystemAccessRegistrationStatusEnum.ACTIVE
                        : UserSystemAccessRegistrationStatusEnum.PENDING,
                    granted_by: auto_approve ? user.id : null,
                    granted_at: auto_approve ? new Date() : null,
                } as any,
                { transaction: tx, user_id: user.id } as CustomCreateOptions<UserSystemAccess>,
            );

            // B5 FIX: user_id: user.id (was shorthand); added { transaction: tx, user_id }
            await this.externalLinksModel.create(
                {
                    user_id      : user.id,
                    system_id,
                    external_id,
                    external_type: 'internal',
                } as any,
                { transaction: tx, user_id: user.id } as CustomCreateOptions<UserExternalLinks>,
            );

            if (auto_approve && defaultRoles.length) {
                for (const role of defaultRoles) {
                    // B5 FIX: user_id: user.id (was shorthand); added { transaction: tx, user_id }
                    await this.userSystemRoleModel.create(
                        {
                            user_id   : user.id,
                            system_id,
                            role_id   : role.id,
                            granted_by: user.id,
                            granted_at: new Date(),
                        } as any,
                        { transaction: tx, user_id: user.id } as CustomCreateOptions<UserSystemRole>,
                    );

                    if (user.keycloak_id && role.keycloak_role_name) {
                        try {
                            if (role.role_type === 'realm') {
                                await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                            } else if (system.keycloak_client_id) {
                                await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                            }
                        } catch (err: any) {
                            this.logger.warn(`Keycloak role sync failed: ${err.message}`);
                        }
                    }
                }
            }

            await tx.commit();
            const sep  = redirect_uri.includes('?') ? '&' : '?';
            this.logger.log(`Redirect link completed: user=${user.id} system=${system_id}`);
            const data = { redirect_url: `${redirect_uri}${sep}linked=true&platform_user_id=${user.id}` };
            return ResponseUtil.success(res, data);
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException || e instanceof UnauthorizedException ||
                e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    async linkInitiate(
        res          : Response,
        keycloak_id  : string,
        body         : LinkInitiateDto,
    ) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
 
            const system = await this.systemService.findById(body.system_id);
            if (!system)           throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_FOUND);
            if (!system.is_active) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_INACTIVE);
 
            // User must not already be connected
            const existing = await this.accessModel.findOne({
                where: { user_id: user.id, system_id: body.system_id },
            });
            if (existing) throw new ConflictException(SYSTEM_ERROR_MESSAGE.SYSTEM_ALREADY_CONNECTED);
 
            // Resolve the link entry URL — explicit column or convention fallback
            const link_entry_url = system.link_entry_url
                ?? (system.base_url ? `${system.base_url}/platform/link` : null);
 
            if (!link_entry_url) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.NO_LINK_ENTRY_URL);
            }
 
            // Generate link session code
            const crypto = await import('crypto');
            const code   = crypto.randomBytes(32).toString('hex');
            const now    = Math.floor(Date.now() / 1000);
 
            await this.redisService.set(`link_session:${code}`, {
                system_id       : body.system_id,
                platform_user_id: user.id,
                external_id     : null,
                step            : 'awaiting_service',
                redirect_path   : body.redirect_path ?? '/user/home',
                iat             : now,
                exp             : now + LINK_SESSION_TTL,
            } as LinkSessionPayload, LINK_SESSION_TTL);
 
            // Build the redirect URL for the integrated system's link page
            const platform_base  = this.configService.get('PLATFORM_BASE_URL', 'http://localhost:4200');
            const confirm_callback = `${platform_base}/user/link-confirm?code=${encodeURIComponent(code)}`;
 
            const sep       = link_entry_url.includes('?') ? '&' : '?';
            const redirect_url = `${link_entry_url}${sep}platform_link_code=${encodeURIComponent(code)}&platform_callback=${encodeURIComponent(confirm_callback)}`;
 
            this.logger.log(`Link initiated: user=${user.id} system=${body.system_id} code=${code.substring(0, 8)}...`);
            return ResponseUtil.success(res, { redirect_url }, SYSTEM_MESSAGE.LINK_INITIATED);
        } catch (e) {
            if (e instanceof NotFoundException || e instanceof ConflictException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    async serviceInitiatedConfirm(
        res        : Response,
        keycloak_id: string,
        body       : ServiceInitiatedConfirmDto,
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
 
            const system = await this.systemService.findById(body.system_id);
            if (!system)           throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_FOUND);
            if (!system.is_active) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_INACTIVE);
 
            // Validate redirect_uri against system's base_url
            if (!system.base_url) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.NO_BASE_URL);
            if (!body.redirect_uri.replace(/\/+$/, '').startsWith(system.base_url.replace(/\/+$/, ''))) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.INVALID_REDIRECT_URI);
            }
 
            // Prevent duplicate link
            const existing = await this.accessModel.findOne({
                where: { user_id: user.id, system_id: body.system_id },
            });
            if (existing) {
                // Already linked — redirect back as success
                await tx.rollback();
                const sep  = body.redirect_uri.includes('?') ? '&' : '?';
                const data = {
                    redirect_url: `${body.redirect_uri}${sep}linked=true&platform_user_id=${user.id}&already_linked=true&state=${body.state ?? ''}`,
                };
                return ResponseUtil.success(res, data);
            }
 
            // Create all link records inside the transaction
            await this._completeLink(user.id, body.system_id, body.external_id, tx);
 
            await tx.commit();
            this.logger.log(`Service-initiated link confirmed: user=${user.id} system=${body.system_id}`);
 
            // Redirect user back to the external system
            const sep  = body.redirect_uri.includes('?') ? '&' : '?';
            const data = {
                redirect_url: `${body.redirect_uri}${sep}linked=true&platform_user_id=${user.id}&state=${body.state ?? ''}`,
            };
            return ResponseUtil.success(res, data, SYSTEM_MESSAGE.CONNECT_SUCCESS);
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException || e instanceof ConflictException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    async getLinkSession(
        res          : Response,
        keycloak_id  : string,
        code         : string,
    ) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
 
            const session = await this.redisService.get<LinkSessionPayload>(`link_session:${code}`);
            if (!session) throw new NotFoundException(SYSTEM_ERROR_MESSAGE.LINK_SESSION_NOT_FOUND);
 
            // Verify this session belongs to the requesting user
            if (session.platform_user_id !== user.id) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.LINK_SESSION_NOT_FOUND);
            }
 
            const system = await this.systemService.findById(session.system_id);
 
            return ResponseUtil.success(res, {
                code,
                step      : session.step,
                system    : {
                    id     : system.id,
                    name_kh: system.name_kh,
                    name_en: system.name_en,
                    logo   : system.logo,
                },
                expires_at: session.exp,
            });
        } catch (e) {
            if (e instanceof NotFoundException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    async linkConfirm(
        res          : Response,
        keycloak_id  : string,
        body         : LinkConfirmDto,
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException(ERROR_MESSAGE.USER_NOT_FOUND);
 
            const session = await this.redisService.get<LinkSessionPayload>(`link_session:${body.code}`);
            if (!session) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.LINK_SESSION_NOT_FOUND);
 
            // Ownership check
            if (session.platform_user_id !== user.id) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.LINK_SESSION_NOT_FOUND);
            }
 
            // Session must have been updated by the service (step: awaiting_user)
            if (session.step !== 'awaiting_user') {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.LINK_SESSION_WRONG_STEP);
            }
 
            const system = await this.systemService.findById(session.system_id);
            if (!system.is_active) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_INACTIVE);
 
            // Double-check not already connected (race condition guard)
            const existing = await this.accessModel.findOne({
                where: { user_id: user.id, system_id: session.system_id },
            });
            if (existing) {
                await this.redisService.del(`link_session:${body.code}`);
                throw new ConflictException(SYSTEM_ERROR_MESSAGE.SYSTEM_ALREADY_CONNECTED);
            }
 
            const defaultRoles = await this.systemService.findDefaultRoles(session.system_id);
            const auto_approve = !system.require_approval;
 
            // Create access record
            await this.accessModel.create(
                {
                    user_id            : user.id,
                    system_id          : session.system_id,
                    account_type       : UserSystemAccessAccountTypeEnum.INTERNAL,
                    registration_status: auto_approve
                        ? UserSystemAccessRegistrationStatusEnum.ACTIVE
                        : UserSystemAccessRegistrationStatusEnum.PENDING,
                    granted_by: auto_approve ? user.id  : null,
                    granted_at: auto_approve ? new Date() : null,
                } as any,
                { transaction: tx, user_id: user.id } as CustomCreateOptions<UserSystemAccess>,
            );
 
            // Create external link using the external_id filled by the service
            await this.externalLinksModel.create(
                {
                    user_id      : user.id,
                    system_id    : session.system_id,
                    external_id  : session.external_id,
                    external_type: 'internal',
                } as any,
                { transaction: tx, user_id: user.id } as CustomCreateOptions<UserExternalLinks>,
            );
 
            // Assign default roles
            if (auto_approve && defaultRoles.length) {
                for (const role of defaultRoles) {
                    await this.userSystemRoleModel.create(
                        {
                            user_id   : user.id,
                            system_id : session.system_id,
                            role_id   : role.id,
                            granted_by: user.id,
                            granted_at: new Date(),
                        } as any,
                        { transaction: tx, user_id: user.id } as CustomCreateOptions<UserSystemRole>,
                    );
 
                    if (user.keycloak_id && role.keycloak_role_name) {
                        try {
                            if (role.role_type === 'realm') {
                                await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                            } else if (system.keycloak_client_id) {
                                await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                            }
                        } catch (err: any) {
                            this.logger.warn(`Keycloak role sync failed for '${role.slug}': ${err.message}`);
                        }
                    }
                }
            }
 
            await tx.commit();
 
            // Clean up the session — it's been used
            await this.redisService.del(`link_session:${body.code}`);
 
            this.logger.log(`Link confirmed: user=${user.id} system=${session.system_id} external=${session.external_id}`);
            return ResponseUtil.success(res, {
                system_id    : session.system_id,
                redirect_path: session.redirect_path,
            }, SYSTEM_MESSAGE.LINK_CONFIRMED);
        } catch (e) {
            await tx.rollback();
            if (e instanceof NotFoundException || e instanceof ConflictException || e instanceof BadRequestException) throw e;
            throw new BadRequestException(e.message);
        }
    }

    // ─── Logout ───────────────────────────────────────────────────────────────
    // AuthService not injected here (avoids circular dependency).
    // B3 FIX: SHA-256 hash of full token — consistent with AuthService.blacklistToken().

    async logout(res: Response, keycloak_id: string, token: string): Promise<any> {
        try {
            if (token) {
                try {
                    const jwtLib  = await import('jsonwebtoken');
                    const decoded = jwtLib.decode(token) as any;
                    const ttl     = decoded?.exp
                        ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0)
                        : 86_400;
                    const hash = createHash('sha256').update(token).digest('hex');
                    await this.redisService.set(`blacklist:${hash}`, '1', ttl);
                } catch (err: any) {
                    this.logger.warn(`Token blacklist failed: ${err.message}`);
                }
            }
            await this.redisService.delPattern(`session:${keycloak_id}:*`);
            return ResponseUtil.success(res, {});
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    private async issueScopedTokenPair(
        user_id  : string,
        system_id: string,
    ): Promise<{
        access_token : string;
        refresh_token: string;
        expires_in   : number;
        token_type   : string;
    }> {
        const access_token  = randomBytes(32).toString('hex');
        const refresh_token = randomBytes(32).toString('hex');
        const now           = Math.floor(Date.now() / 1000);
        const ACCESS_TTL    = 900;
        const REFRESH_TTL   = 604_800;
 
        await Promise.all([
            this.redisService.set(`scoped_access:${access_token}`, {
                user_id, system_id, type: 'access',
                iat: now, exp: now + ACCESS_TTL,
            }, ACCESS_TTL),
            this.redisService.set(`scoped_refresh:${refresh_token}`, {
                user_id, system_id, type: 'refresh',
                iat: now, exp: now + REFRESH_TTL,
            }, REFRESH_TTL),
        ]);
 
        this.logger.log(`Scoped token pair issued: user=${user_id} system=${system_id}`);
        return { access_token, refresh_token, expires_in: ACCESS_TTL, token_type: 'Bearer' };
    }

    private async _completeLink(
        user_id    : string,
        system_id  : string,
        external_id: string,
        tx         : import('sequelize').Transaction,
    ): Promise<void> {
        const system       = await this.systemService.findById(system_id);
        const defaultRoles = await this.systemService.findDefaultRoles(system_id);
        const auto_approve = !system.require_approval;
 
        await this.accessModel.create(
            {
                user_id,
                system_id,
                account_type       : UserSystemAccessAccountTypeEnum.INTERNAL,
                registration_status: auto_approve
                    ? UserSystemAccessRegistrationStatusEnum.ACTIVE
                    : UserSystemAccessRegistrationStatusEnum.PENDING,
                granted_by: auto_approve ? user_id : null,
                granted_at: auto_approve ? new Date() : null,
            } as any,
            { transaction: tx, user_id } as CustomCreateOptions<UserSystemAccess>,
        );
 
        await this.externalLinksModel.create(
            {
                user_id,
                system_id,
                external_id,
                external_type: 'internal',
            } as any,
            { transaction: tx, user_id } as CustomCreateOptions<UserExternalLinks>,
        );
 
        if (auto_approve && defaultRoles.length) {
            const user = (await this.userService.findById(user_id)) as any;
 
            for (const role of defaultRoles) {
                await this.userSystemRoleModel.create(
                    {
                        user_id,
                        system_id,
                        role_id   : role.id,
                        granted_by: user_id,
                        granted_at: new Date(),
                    } as any,
                    { transaction: tx, user_id } as CustomCreateOptions<UserSystemRole>,
                );
 
                if (user?.keycloak_id && role.keycloak_role_name) {
                    try {
                        if (role.role_type === 'realm') {
                            await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                        } else if (system.keycloak_client_id) {
                            await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                        }
                    } catch (err: any) {
                        this.logger.warn(`Keycloak role sync failed for '${role.slug}': ${err.message}`);
                    }
                }
            }
        }
 
        this.logger.log(`Link records created: user=${user_id} system=${system_id}`);
    }
}