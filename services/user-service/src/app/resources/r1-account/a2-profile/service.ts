import {
    Injectable, Logger, UnauthorizedException,
    NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectModel }          from '@nestjs/sequelize';
import { Op, Sequelize, Transaction }                   from 'sequelize';
import axios                    from 'axios';
import { KeycloakAdminService } from '../../../communications/keycloak/keycloak-admin.service';
import { RedisService }         from '@app/infra/cache/redis.service';
import {
    UpdateProfileDto, ConnectSystemDto,
    ValidateRedirectDto, RedirectLinkDto,
    ChangePasswordDto,
    ChangeEmailDto,
    ChangePhoneDto,
} from './dto';
import { UserService }      from '@app/resources/r2-user/service';
import { SystemService }    from '@app/resources/r4-systems/service';
import UserSystemAccess     from '../../../../models/user/user-system-access.model';
import UserExternalLinks    from '../../../../models/user/user-external-links.model';
import UserSystemRole       from '../../../../models/user/user-system-role.model';
import SystemRole           from '../../../../models/system/system-role.model';
import System               from '../../../../models/system/system.model';
import { Response } from 'express';
import { ResponseUtil } from '@app/shared/interfaces/base.interface';
import { AUTH_ERROR_MESSAGE, PROFILE_MESSAGE, SYSTEM_ERROR_MESSAGE } from '@app/shared/enums/message.enum';

const PLATFORM_SYSTEM_ID = 'platform';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        @InjectModel(UserSystemAccess)
        private readonly accessModel            : typeof UserSystemAccess,
        @InjectModel(UserExternalLinks)
        private readonly externalLinksModel     : typeof UserExternalLinks,
        @InjectModel(UserSystemRole)
        private readonly userSystemRoleModel    : typeof UserSystemRole,
        @InjectModel(SystemRole)
        private readonly systemRoleModel        : typeof SystemRole,
        private readonly userService            : UserService,
        private readonly systemService          : SystemService,
        private readonly keycloakAdmin          : KeycloakAdminService,
        private readonly redisService           : RedisService,
        private readonly sequelize              : Sequelize,
    ) {}

    // ─── GET /profile/me ─────────────────────────────────────────────────────
    // Lightweight response for the frontend resolver + guards.
    // Returns user fields + their platform roles only.

    async getMe(
        res: Response, 
        keycloak_id: string
    ) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            const userRoles = await this.userSystemRoleModel.findAll({
                where  : { user_id: user.id, system_id: PLATFORM_SYSTEM_ID },
                include: [{ model: SystemRole, as: 'role' }],
                order  : [['created_at', 'ASC']],
            });
    
            const userData = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    
            const data = {
                ...userData,
                platform_roles: userRoles.map(ur => ({
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
            console.log(e);
            throw new BadRequestException(e.message);
        }
    }

    // ─── GET /profile ─────────────────────────────────────────────────────────
    // Full profile for the profile page — user + all connected systems + roles.

    async getProfile(
        res: Response, 
        keycloak_id: string
    ) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            const system_access = await this.accessModel.findAll({
                where  : { user_id: user.id },
                include: [{ model: System, as: 'system' }],
                order  : [['created_at', 'ASC']],
            });
    
            // Attach roles to each system access
            const accessWithRoles = await Promise.all(
                system_access.map(async (access) => {
                    const roles = await this.userSystemRoleModel.findAll({
                        where  : { user_id: user.id, system_id: access.system_id },
                        include: [{ model: SystemRole, as: 'role' }],
                    });
                    const plain = typeof access.toJSON === 'function' ? access.toJSON() : { ...access };
                    return {
                        ...plain,
                        roles: roles.map(ur => ur.role),
                    };
                }),
            );
    
            const userData = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
            const data = { ...userData, system_access: accessWithRoles };
            return ResponseUtil.success(res, data);
        } catch (e) {
            console.log(e);
            throw new BadRequestException(e.message);
        }
    }

    // ─── Update Profile ───────────────────────────────────────────────────────
    // DB update + Keycloak sync for any field Keycloak cares about.

    async updateProfile(
        res: Response, 
        keycloak_id: string, 
        body: UpdateProfileDto
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            // ── Sync name to Keycloak if changed ──────────────────────────────────
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
    
            // ── Update DB ─────────────────────────────────────────────────────────
            Object.assign(user, body);
            user.updater_id = user.id;
            await user.save({ transaction: tx });

            await tx.commit();
    
            await this.redisService.del(`user:keycloak:${keycloak_id}`);
            await this.redisService.del(`user:profile:${user.id}`);
    
            return ResponseUtil.success(res, user, PROFILE_MESSAGE.UPDATE_SUCCESS);
        } catch (e) {
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
    }

    // ─── Change Password ──────────────────────────────────────────────────────

    async changePassword(
        res: Response, 
        keycloak_id: string, 
        body: ChangePasswordDto
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user?.keycloak_id) throw new BadRequestException('User not linked to identity provider');
            await this.keycloakAdmin.setPassword(user.keycloak_id, body.new_password);
            await tx.commit();
            return ResponseUtil.success(res, { success: true }, PROFILE_MESSAGE.CHANGE_PASSWORD_SUCCESS);
        } catch (e) {
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
    }

    // ─── Change Email ─────────────────────────────────────────────────────────
    // Updates Keycloak first, then mirrors to DB.

    async changeEmail(
        res: Response,
        keycloak_id: string, 
        body: ChangeEmailDto
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user?.keycloak_id) throw new BadRequestException('User not linked to identity provider');
    
            await this.keycloakAdmin.setEmail(user.keycloak_id, body.new_email);
            await this.userService.updateMirrorFields(user.id, { email: body.new_email });
            await tx.commit();
            return ResponseUtil.success(res, { success: true }, PROFILE_MESSAGE.CHANGE_EMAIL_SUCCESS);
        } catch (e) {
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
    }

    // ─── Change Phone (username in Keycloak) ──────────────────────────────────

    async changePhone(
        res: Response,
        keycloak_id: string, 
        body: ChangePhoneDto
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user?.keycloak_id) throw new BadRequestException('User not linked to identity provider');

            await this.keycloakAdmin.updateUsername(user.keycloak_id, body.new_phone);
            await this.userService.updatePhone(user.id, body.new_phone);
            await tx.commit();
            return ResponseUtil.success(res, { success: true }, PROFILE_MESSAGE.CHANGE_PHONE_SUCCESS);
        } catch (e) {
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
    }

    // ─── Get Available Systems ────────────────────────────────────────────────

    async getAvailableSystems(
        res: Response,
        keycloak_id: string
    ) {
        try {
            const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            const connected = await this.accessModel.findAll({
                where: { user_id: user.id },
                attributes: ['system_id'],
            });
            const connected_ids = connected.map(a => a.system_id);
    
            const systems = await System.findAll({
                where: {
                    id       : { [Op.notIn]: [...connected_ids, PLATFORM_SYSTEM_ID] },
                    is_active: true,
                },
                order: [['name', 'ASC']],
            });
    
            return ResponseUtil.success(res, systems);
        } catch (e) {
            console.log(e);
            throw new BadRequestException(e.message);
        }
    }

    // ─── Connect System ───────────────────────────────────────────────────────
    // Validates credentials against the system, creates access record,
    // assigns default roles via user_system_roles.

    async connectSystem(
        res: Response,
        keycloak_id: string, 
        body: ConnectSystemDto
    ) {
        const tx = await this.sequelize.transaction();
        try {
            const user   = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            const system = await this.systemService.findById(body.system_id);
            if (!system) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_FOUND);
            if (!system.is_active) throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_INACTIVE);
    
            const existing = await this.accessModel.findOne({
                where: { user_id: user.id, system_id: body.system_id },
            });
            if (existing) throw new ConflictException(SYSTEM_ERROR_MESSAGE.SYSTEM_ALREADY_CONNECTED);
    
            // Validate credentials against external system
            let external_id: string;
            if (!system.auth_callback_url) {
                throw new BadRequestException(SYSTEM_ERROR_MESSAGE.SYSTEM_NOT_ALLOW_CONNECTION);
            }
    
            try {
                const { data } = await axios.post(system.auth_callback_url, {
                    username: body.username,
                    password: body.password,
                }, { timeout: 10_000 });
    
                if (!data?.valid) {
                    throw new UnauthorizedException(AUTH_ERROR_MESSAGE.INVALID_CREDENTIALS);
                }
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
    
            // Create the access record (connection status — no roles here anymore)
            const access = await this.accessModel.create({
                    user_id            : user.id,
                    system_id          : body.system_id,
                    account_type       : 'internal',
                    registration_status: auto_approve ? 'active' : 'pending',
                    granted_by         : auto_approve ? user.id  : null,
                    granted_at         : auto_approve ? new Date() : null,
                    creator_id         : user.id,
                },
                {
                    transaction: tx
                }
            );
    
            // Store external link
            await this.externalLinksModel.create({
                user_id      : user.id,
                system_id    : body.system_id,
                external_id,
                external_type: 'internal',
                creator_id   : user.id,
            } as any);
    
            // Assign default roles via junction table + sync Keycloak
            if (auto_approve && defaultRoles.length) {
                for (const role of defaultRoles) {
                    await this.userSystemRoleModel.create({
                        user_id   : user.id,
                        system_id : body.system_id,
                        role_id   : role.id,
                        granted_by: user.id,
                        granted_at: new Date(),
                        creator_id: user.id,
                    } as any);
    
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
    
            this.logger.log(`System connected: user=${user.id} system=${body.system_id}`);
            return ResponseUtil.success(res, access);
        } catch (e) {
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
    }

    // ─── Disconnect System ────────────────────────────────────────────────────

    async disconnectSystem(
        res: Response, 
        keycloak_id: string, 
        system_id: string
    ): Promise<any> {
        const tx = await this.sequelize.transaction();
        try{
            const user   = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            const access = await this.accessModel.findOne({
                where: { user_id: user.id, system_id },
            });
            if (!access) throw new NotFoundException('ការភ្ជាប់នេះមិនមាន');
    
            const system = await this.systemService.findById(system_id);
    
            // Revoke all roles for this system
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
                ur.deleter_id = user.id;
                await ur.save();
                await ur.destroy();
            }
    
            // Remove external links
            await this.externalLinksModel.destroy({ where: { user_id: user.id, system_id } });
    
            access.deleter_id = user.id;
            await access.save();
            await access.destroy();
    
            this.logger.log(`System disconnected: user=${user.id} system=${system_id}`);

            await tx.commit();
            return ResponseUtil.success(res, { success: true }, SYSTEM_ERROR_MESSAGE.SYSTEM_DISCONNECTION_FAILED);
        } catch(e){
            console.log(e);
            await tx.rollback();
            throw new BadRequestException(e.message);
        }
    }

    // ─── Assign Platform User Role (called on registration) ──────────────────

    async assignPlatformUserRole(
        res: Response,
        user_id: string
    ): Promise<void> {
        const platformUserRole = await this.systemRoleModel.findOne({
            where: { system_id: PLATFORM_SYSTEM_ID, slug: 'user', is_active: true },
        });
        if (!platformUserRole) {
            this.logger.warn('Platform user role not found — skipping assignment');
            return;
        }

        const existing = await this.userSystemRoleModel.findOne({
            where: { user_id, role_id: platformUserRole.id },
        });
        if (existing) return;

        await this.userSystemRoleModel.create({
            user_id,
            system_id : PLATFORM_SYSTEM_ID,
            role_id   : platformUserRole.id,
            granted_by: user_id,
            granted_at: new Date(),
            creator_id: user_id,
        } as any);

        this.logger.log(`Platform user role assigned: user=${user_id}`);
    }

    // ─── SSO Navigate ─────────────────────────────────────────────────────────


    async getSsoNavigateUrl(
        res: Response,
        keycloak_id: string, 
        system_id: string, 
        access_token: string
    ) {
        const user = (await this.userService.findByKeycloakId(keycloak_id)).data;
        if (!user) throw new NotFoundException('User not found');

        const access = await this.accessModel.findOne({
            where: { user_id: user.id, system_id, registration_status: 'active' },
        });
        if (!access) throw new BadRequestException('អ្នកមិនមានសិទ្ធិចូលប្រព័ន្ធនេះ');

        const system = await this.systemService.findById(system_id);
        if (!system.base_url) throw new BadRequestException('ប្រព័ន្ធនេះមិនមានអាស័យដ្ឋាន URL');

        if (system.keycloak_client_id) {
            return { url: `${system.base_url}?platform_token=${encodeURIComponent(access_token)}` };
        }

        if (system.auth_callback_url) {
            try {
                const sso_url  = system.auth_callback_url.replace('/auth/validate', '/auth/sso');
                const { data } = await axios.post(sso_url, {
                    platform_user_id: user.id,
                    platform_token  : access_token,
                }, { timeout: 10_000 });

                const system_token = data.token || data.access_token;
                if (!system_token) throw new Error('No token in SSO response');
                return { url: `${system.base_url}?token=${encodeURIComponent(system_token)}` };
            } catch (err: any) {
                this.logger.error(`SSO exchange failed: ${err.message}`);
                throw new BadRequestException('មិនអាចភ្ជាប់ប្រព័ន្ធបាន');
            }
        }

        throw new BadRequestException('ប្រព័ន្ធនេះមិនគាំទ្រ SSO');
    }

    // ─── Redirect Login Validation (Phase 7) ─────────────────────────────────
    // Returns one-time code stored in Redis — external system exchanges it via
    // POST /auth/login/keycloak/callback

    async validateRedirectLogin(
        res: Response,
        keycloak_id  : string,
        system_id    : string,
        redirect_uri : string,
        action       : 'login' | 'link',
        access_token : string,
    ): Promise<{ redirect_url: string }> {
        const user   = (await this.userService.findByKeycloakId(keycloak_id)).data;
        if (!user) throw new NotFoundException('User not found');

        const system = await this.systemService.findById(system_id);
        if (!system.is_active) throw new BadRequestException('ប្រព័ន្ធនេះមិនមានសកម្ម');

        if (!system.base_url) throw new BadRequestException('ប្រព័ន្ធនេះមិនមានការកំណត់ redirect URL');

        const normalizedBase = system.base_url.replace(/\/+$/, '');
        if (!redirect_uri.replace(/\/+$/, '').startsWith(normalizedBase)) {
            throw new BadRequestException('redirect_uri មិនត្រូវនឹងប្រព័ន្ធដែលបានចុះឈ្មោះ');
        }

        if (action === 'login') {
            const access = await this.accessModel.findOne({
                where: { user_id: user.id, system_id, registration_status: 'active' },
            });
            if (!access) throw new BadRequestException('អ្នកមិនទាន់ភ្ជាប់ប្រព័ន្ធនេះ');

            let token = access_token;
            if (!system.keycloak_client_id && system.auth_callback_url) {
                try {
                    const sso_url  = system.auth_callback_url.replace('/auth/validate', '/auth/sso');
                    const { data } = await axios.post(sso_url, {
                        platform_user_id: user.id,
                        platform_token  : access_token,
                    }, { timeout: 10_000 });
                    token = data.token || data.access_token || access_token;
                } catch (err: any) {
                    this.logger.warn(`Token exchange failed, using platform token: ${err.message}`);
                }
            }

            const crypto     = await import('crypto');
            const code       = crypto.randomBytes(32).toString('hex');
            await this.redisService.set(`redirect:code:${code}`, {
                token, user_id: user.id, system_id,
            }, 300);

            const sep = redirect_uri.includes('?') ? '&' : '?';
            this.logger.log(`Redirect login code issued: user=${user.id} system=${system_id}`);
            return { redirect_url: `${redirect_uri}${sep}code=${encodeURIComponent(code)}` };
        }

        const sep = redirect_uri.includes('?') ? '&' : '?';
        this.logger.log(`Redirect link ready: user=${user.id} system=${system_id}`);
        return { redirect_url: `${redirect_uri}${sep}status=ready&platform_user_id=${user.id}` };
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

        return {
            access_token: data.token,
            user_id     : data.user_id,
            system_id   : data.system_id,
        };
    }

    // ─── Redirect Link Account (Phase 8) ─────────────────────────────────────

    async redirectLinkAccount(
        res: Response,
        keycloak_id : string,
        system_id   : string,
        redirect_uri: string,
        username    : string,
        password    : string,
    ): Promise<any> {
        try{

            const user   = (await this.userService.findByKeycloakId(keycloak_id)).data;
            if (!user) throw new NotFoundException('User not found');
    
            const system = await this.systemService.findById(system_id);
            if (!system.base_url) throw new BadRequestException('ប្រព័ន្ធនេះមិនមានការកំណត់ redirect URL');
            if (!redirect_uri.replace(/\/+$/, '').startsWith(system.base_url.replace(/\/+$/, ''))) {
                throw new BadRequestException('redirect_uri មិនត្រូវនឹងប្រព័ន្ធដែលបានចុះឈ្មោះ');
            }
    
            const existing = await this.accessModel.findOne({ where: { user_id: user.id, system_id } });
            if (existing) {
                const sep = redirect_uri.includes('?') ? '&' : '?';
                return { redirect_url: `${redirect_uri}${sep}linked=true&platform_user_id=${user.id}&already_linked=true` };
            }
    
            if (!system.auth_callback_url) {
                throw new BadRequestException('ប្រព័ន្ធនេះមិនគាំទ្រការភ្ជាប់ដោយលេខសំងាត់');
            }
    
            let external_id: string;
            try {
                const { data } = await axios.post(system.auth_callback_url, { username, password }, { timeout: 10_000 });
                if (!data?.valid) throw new UnauthorizedException('ឈ្មោះអ្នកប្រើ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
                external_id = String(data.external_id || data.user_id || data.id);
            } catch (err: any) {
                if (err instanceof UnauthorizedException) throw err;
                throw new BadRequestException('មិនអាចភ្ជាប់ប្រព័ន្ធបាន');
            }
    
            const defaultRoles = await this.systemService.findDefaultRoles(system_id);
            const auto_approve = !system.require_approval;
    
            await this.accessModel.create({
                user_id            : user.id,
                system_id,
                account_type       : 'internal',
                registration_status: auto_approve ? 'active' : 'pending',
                granted_by         : auto_approve ? user.id  : null,
                granted_at         : auto_approve ? new Date() : null,
                creator_id         : user.id,
            } as any);
    
            await this.externalLinksModel.create({
                user_id: user.id, system_id, external_id, external_type: 'internal', creator_id: user.id,
            } as any);
    
            if (auto_approve && defaultRoles.length) {
                for (const role of defaultRoles) {
                    await this.userSystemRoleModel.create({
                        user_id: user.id, system_id, role_id: role.id,
                        granted_by: user.id, granted_at: new Date(), creator_id: user.id,
                    } as any);
    
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
    
            const sep = redirect_uri.includes('?') ? '&' : '?';
            this.logger.log(`Redirect link completed: user=${user.id} system=${system_id}`);
            const data = { redirect_url: `${redirect_uri}${sep}linked=true&platform_user_id=${user.id}` };
            return ResponseUtil.success(res, data);
        } catch(e){
            console.log(e);
            throw new BadRequestException(e.message);
        }
    }

    // ─── Logout ───────────────────────────────────────────────────────────────
    // AuthService is intentionally NOT injected here to avoid circular dependency
    // (ProfileModule → AuthModule → ProfileService → AuthService → ...).
    // Token blacklisting is done directly via RedisService using the same key
    // pattern that AuthService.blacklistToken() uses.

    async logout(
        res: Response, 
        keycloak_id: string, 
        token: string
    ): Promise<any> {
        try{
            if (token) {
                try {
                    const jwt = await import('jsonwebtoken');
                    const decoded = jwt.decode(token) as any;
                    const ttl = decoded?.exp
                        ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0)
                        : 86_400;
                    // Same key pattern as AuthService.blacklistToken()
                    await this.redisService.set(`blacklist:${token}`, '1', ttl);
                } catch (err: any) {
                    this.logger.warn(`Token blacklist failed: ${err.message}`);
                }
            }
            await this.redisService.delPattern(`session:${keycloak_id}:*`);
            return { success: true };
        } catch(e){
            console.log(e);
            throw new BadRequestException(e.message);
        }
    }
}