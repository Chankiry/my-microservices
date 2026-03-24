import {
    Injectable, Logger, UnauthorizedException,
    NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectModel }          from '@nestjs/sequelize';
import { Op }                   from 'sequelize';
import axios                    from 'axios';
import { KeycloakAdminService } from '../../../communications/keycloak/keycloak-admin.service';
import { AuthService }          from '../a1-auth/service';
import { RedisService }         from '@app/infra/cache/redis.service';
import {
    UpdateProfileDto, ChangePasswordDto, ChangeEmailDto,
    ChangePhoneDto, ConnectSystemDto,
} from './dto';
import { UserService }      from '@app/resources/r2-user/service';
import { SystemService }    from '@app/resources/r4-systems/service';
import UserSystemAccess     from '../../../../models/user/user-system-access.model';
import UserExternalLinks    from '../../../../models/user/user-external-links.model';
import System               from '../../../../models/system/system.model';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        @InjectModel(UserSystemAccess)
        private readonly accessModel        : typeof UserSystemAccess,
        @InjectModel(UserExternalLinks)
        private readonly externalLinksModel : typeof UserExternalLinks,
        private readonly userService        : UserService,
        private readonly systemService      : SystemService,
        private readonly keycloakAdmin      : KeycloakAdminService,
        private readonly authService        : AuthService,
        private readonly redisService       : RedisService,
    ) {}

    // ─── Get profile + connected systems ──────────────────────────────────────

    async getProfile(keycloak_id: string) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const system_access = await this.accessModel.findAll({
            where  : { user_id: user.id },
            include: [{ model: System, as: 'system' }],
            order  : [['created_at', 'ASC']],
        });

        // user may be a cached plain object or a Sequelize instance — handle both
        const userData = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
        return { ...userData, system_access };
    }

    // ─── Get available systems (not yet connected) ────────────────────────────

    async getAvailableSystems(keycloak_id: string) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        // Get systems user already has access to
        const connected = await this.accessModel.findAll({
            where: { user_id: user.id },
            attributes: ['system_id'],
        });
        const connected_ids = connected.map(a => a.system_id);

        // Return active systems not yet connected
        const where: any = { is_active: true };
        if (connected_ids.length) {
            where.id = { [Op.notIn]: connected_ids };
        }

        const systems = await System.findAll({ where, order: [['name', 'ASC']] });
        return { data: systems };
    }

    // ─── Connect to internal system ───────────────────────────────────────────

    async connectSystem(keycloak_id: string, dto: ConnectSystemDto) {
        const user   = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const system = await this.systemService.findById(dto.system_id);

        // Check not already connected
        const existing = await this.accessModel.findOne({
            where: { user_id: user.id, system_id: dto.system_id },
        });
        if (existing) {
            throw new ConflictException('ប្រព័ន្ធនេះត្រូវបានភ្ជាប់រួចហើយ');
        }

        // Validate credentials against the system's callback URL
        if (!system.auth_callback_url) {
            throw new BadRequestException('ប្រព័ន្ធនេះមិនគាំទ្រការភ្ជាប់ដោយលេខសំងាត់');
        }

        let external_id: string;
        try {
            const { data } = await axios.post(system.auth_callback_url, {
                username: dto.username,
                password: dto.password,
            }, { timeout: 10_000 });

            if (!data?.valid) {
                throw new UnauthorizedException('ឈ្មោះអ្នកប្រើ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
            }

            external_id = String(data.external_id || data.user_id || data.id);
        } catch (err: any) {
            if (err?.response?.status === 401 || err instanceof UnauthorizedException) {
                throw new UnauthorizedException('ឈ្មោះអ្នកប្រើ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
            }
            this.logger.error(`System auth callback failed: ${err.message}`);
            throw new BadRequestException('មិនអាចភ្ជាប់ប្រព័ន្ធបាន សូមព្យាយាមម្ដងទៀត');
        }

        // Get default roles for this system
        const roles = await this.systemService.findRoleNames(dto.system_id);
        const auto_approve = !system.require_approval;

        // Create access record
        const access = await this.accessModel.create({
            user_id            : user.id,
            system_id          : dto.system_id,
            account_type       : 'internal',
            registration_status: auto_approve ? 'active' : 'pending',
            system_roles       : roles,
            granted_by         : auto_approve ? user.id : null,
            granted_at         : auto_approve ? new Date() : null,
            creator_id         : user.id,
        } as any);

        // Store external link (maps platform user ↔ system user)
        await this.externalLinksModel.create({
            user_id      : user.id,
            system_id    : dto.system_id,
            external_id,
            external_type: 'internal',
            creator_id   : user.id,
        } as any);

        // Sync Keycloak roles if system has keycloak_client_id
        if (auto_approve && user.keycloak_id && system.keycloak_client_id && roles.length) {
            for (const role of roles) {
                try {
                    await this.keycloakAdmin.assignClientRole(
                        user.keycloak_id,
                        system.keycloak_client_id,
                        role,
                    );
                } catch (err: any) {
                    this.logger.warn(`Keycloak role sync failed for '${role}': ${err.message}`);
                }
            }
        }

        this.logger.log(`System connected: user=${user.id} system=${dto.system_id}`);
        return access;
    }

    // ─── Disconnect from system ───────────────────────────────────────────────

    async disconnectSystem(keycloak_id: string, system_id: string) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const access = await this.accessModel.findOne({
            where: { user_id: user.id, system_id },
        });
        if (!access) throw new NotFoundException('ការភ្ជាប់ប្រព័ន្ធមិនមាន');

        // Remove external link
        await this.externalLinksModel.destroy({
            where: { user_id: user.id, system_id },
        });

        // Remove Keycloak roles if applicable
        const system = await this.systemService.findById(system_id);
        if (user.keycloak_id && system.keycloak_client_id && access.system_roles.length) {
            for (const role of access.system_roles) {
                try {
                    await this.keycloakAdmin.revokeClientRole(
                        user.keycloak_id,
                        system.keycloak_client_id,
                        role,
                    );
                } catch (err: any) {
                    this.logger.warn(`Keycloak role removal failed for '${role}': ${err.message}`);
                }
            }
        }

        await access.destroy();
        this.logger.log(`System disconnected: user=${user.id} system=${system_id}`);
        return { success: true };
    }

    // ─── Update profile ───────────────────────────────────────────────────────

    async updateProfile(keycloak_id: string, dto: UpdateProfileDto) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const nameChanged =
            (dto.first_name !== undefined && dto.first_name !== user.first_name) ||
            (dto.last_name  !== undefined && dto.last_name  !== user.last_name);

        if (nameChanged && user.keycloak_id) {
            const new_first = dto.first_name ?? user.first_name ?? '';
            const new_last  = dto.last_name  ?? user.last_name  ?? '';
            await this.keycloakAdmin.updateName(user.keycloak_id, new_first, new_last);
            await this.userService.updateMirrorFields(user.id, {
                first_name: dto.first_name ?? user.first_name ?? null,
                last_name : dto.last_name  ?? user.last_name  ?? null,
            });
        }

        const { first_name, last_name, ...profileFields } = dto;
        if (Object.keys(profileFields).length > 0) {
            return this.userService.updateBusinessProfile(user.id, profileFields);
        }
        if (nameChanged) return this.userService.findByKeycloakId(keycloak_id);
        return user;
    }

    // ─── Change password ──────────────────────────────────────────────────────

    async changePassword(keycloak_id: string, dto: ChangePasswordDto) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user?.keycloak_id) throw new UnauthorizedException('User not linked to identity provider');
        await this.keycloakAdmin.setPassword(user.keycloak_id, dto.new_password);
        return { success: true };
    }

    // ─── Change email ─────────────────────────────────────────────────────────

    async changeEmail(keycloak_id: string, dto: ChangeEmailDto) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user?.keycloak_id) throw new UnauthorizedException('User not linked to identity provider');
        await this.keycloakAdmin.setEmail(user.keycloak_id, dto.new_email);
        return { success: true };
    }

    // ─── Change phone ─────────────────────────────────────────────────────────

    async changePhone(keycloak_id: string, dto: ChangePhoneDto) {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user?.keycloak_id) throw new UnauthorizedException('User not linked to identity provider');
        await this.keycloakAdmin.updateUsername(user.keycloak_id, dto.new_phone);
        await this.userService.updatePhone(user.id, dto.new_phone);
        return { success: true };
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    async logout(keycloak_id: string, token?: string) {
        if (token) await this.authService.blacklistToken(token, 86_400);
        await this.redisService.delPattern(`session:${keycloak_id}:*`);
        return { success: true };
    }

    // ─── SSO Navigate ─────────────────────────────────────────────────────────

    async getSsoNavigateUrl(
        keycloak_id  : string,
        system_id    : string,
        access_token : string,
    ): Promise<{ url: string }> {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const access = await this.accessModel.findOne({
            where: { user_id: user.id, system_id, registration_status: 'active' },
        });
        if (!access) throw new BadRequestException('អ្នកមិនមានសិទ្ធិចូលប្រព័ន្ធនេះ');

        const system = await this.systemService.findById(system_id);
        if (!system.base_url) throw new BadRequestException('ប្រព័ន្ធនេះមិនមានអាស័យដ្ឋាន URL');

        // System uses Keycloak → send JWT directly
        if (system.keycloak_client_id) {
            const url = `${system.base_url}?platform_token=${encodeURIComponent(access_token)}`;
            this.logger.log(`SSO navigate (Keycloak): user=${user.id} system=${system_id}`);
            return { url };
        }

        // Internal system → exchange for system token
        if (system.auth_callback_url) {
            try {
                const sso_url = system.auth_callback_url.replace('/auth/validate', '/auth/sso');
                const { data } = await axios.post(sso_url, {
                    platform_user_id: user.id,
                    platform_token  : access_token,
                }, { timeout: 10_000 });

                const system_token = data.token || data.access_token;
                if (!system_token) throw new Error('No token in SSO response');

                const url = `${system.base_url}?token=${encodeURIComponent(system_token)}`;
                this.logger.log(`SSO navigate (exchange): user=${user.id} system=${system_id}`);
                return { url };
            } catch (err: any) {
                this.logger.error(`SSO token exchange failed: ${err.message}`);
                throw new BadRequestException('មិនអាចភ្ជាប់ប្រព័ន្ធបាន');
            }
        }

        throw new BadRequestException('ប្រព័ន្ធនេះមិនគាំទ្រ SSO');
    }


    // ─── Redirect Login Validation (Phase 7) ─────────────────────────────────
    // Called after user logs in — validates redirect_uri and returns redirect URL

    async validateRedirectLogin(
        keycloak_id  : string,
        system_id    : string,
        redirect_uri : string,
        action       : 'login' | 'link',
        access_token : string,
    ): Promise<{ redirect_url: string }> {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const system = await this.systemService.findById(system_id);

        if (!system.is_active) {
            throw new BadRequestException('ប្រព័ន្ធនេះមិនមានសកម្ម');
        }

        // Validate redirect_uri starts with system's base_url
        if (!system.base_url) {
            throw new BadRequestException('ប្រព័ន្ធនេះមិនមានការកំណត់ redirect URL');
        }

        const normalizedBase     = system.base_url.replace(/\/+$/, '');
        const normalizedRedirect = redirect_uri.replace(/\/+$/, '');

        if (!normalizedRedirect.startsWith(normalizedBase)) {
            throw new BadRequestException('redirect_uri មិនត្រូវនឹងប្រព័ន្ធដែលបានចុះឈ្មោះ');
        }

        if (action === 'login') {
            // Check user has active access to this system
            const access = await this.accessModel.findOne({
                where: { user_id: user.id, system_id, registration_status: 'active' },
            });
            if (!access) {
                throw new BadRequestException('អ្នកមិនទាន់ភ្ជាប់ប្រព័ន្ធនេះ');
            }

            // Build redirect URL with token
            let token = access_token;

            // Internal system — exchange for system token
            if (!system.keycloak_client_id && system.auth_callback_url) {
                try {
                    const sso_url = system.auth_callback_url.replace('/auth/validate', '/auth/sso');
                    const { data } = await axios.post(sso_url, {
                        platform_user_id: user.id,
                        platform_token  : access_token,
                    }, { timeout: 10_000 });
                    token = data.token || data.access_token || access_token;
                } catch (err: any) {
                    this.logger.warn(`Token exchange failed, using platform token: ${err.message}`);
                }
            }

            const separator   = redirect_uri.includes('?') ? '&' : '?';
            const redirect_url = `${redirect_uri}${separator}token=${encodeURIComponent(token)}`;

            this.logger.log(`Redirect login: user=${user.id} system=${system_id}`);
            return { redirect_url };
        }

        // action === 'link' — Phase 8
        // For link, the frontend handles showing the connect dialog after login.
        // This endpoint only validates that the redirect_uri is allowed.
        // The actual linking is done via POST /profile/redirect/link
        const separator    = redirect_uri.includes('?') ? '&' : '?';
        const redirect_url = `${redirect_uri}${separator}status=ready&platform_user_id=${user.id}`;
        this.logger.log(`Redirect link ready: user=${user.id} system=${system_id}`);
        return { redirect_url };
    }


    // ─── Redirect Link Account (Phase 8) ─────────────────────────────────────
    // Called after user provides external system credentials during redirect link flow

    async redirectLinkAccount(
        keycloak_id : string,
        system_id   : string,
        redirect_uri: string,
        username    : string,
        password    : string,
    ): Promise<{ redirect_url: string }> {
        const user   = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const system = await this.systemService.findById(system_id);

        // Validate redirect_uri
        if (!system.base_url) throw new BadRequestException('ប្រព័ន្ធនេះមិនមានការកំណត់ redirect URL');
        const normalizedBase = system.base_url.replace(/\/+$/, '');
        if (!redirect_uri.replace(/\/+$/, '').startsWith(normalizedBase)) {
            throw new BadRequestException('redirect_uri មិនត្រូវនឹងប្រព័ន្ធដែលបានចុះឈ្មោះ');
        }

        // Check not already linked
        const existing = await this.accessModel.findOne({
            where: { user_id: user.id, system_id },
        });
        if (existing) {
            // Already linked — redirect with success
            const sep = redirect_uri.includes('?') ? '&' : '?';
            return { redirect_url: `${redirect_uri}${sep}linked=true&platform_user_id=${user.id}&already_linked=true` };
        }

        // Validate credentials against system
        if (!system.auth_callback_url) {
            throw new BadRequestException('ប្រព័ន្ធនេះមិនគាំទ្រការភ្ជាប់ដោយលេខសំងាត់');
        }

        let external_id: string;
        try {
            const { data } = await axios.post(system.auth_callback_url, {
                username,
                password,
            }, { timeout: 10_000 });

            if (!data?.valid) throw new UnauthorizedException('ឈ្មោះអ្នកប្រើ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
            external_id = String(data.external_id || data.user_id || data.id);
        } catch (err: any) {
            if (err instanceof UnauthorizedException) throw err;
            this.logger.error(`System auth callback failed: ${err.message}`);
            throw new BadRequestException('មិនអាចភ្ជាប់ប្រព័ន្ធបាន');
        }

        // Create access + external link
        const roles       = await this.systemService.findRoleNames(system_id);
        const auto_approve = !system.require_approval;

        await this.accessModel.create({
            user_id            : user.id,
            system_id,
            account_type       : 'internal',
            registration_status: auto_approve ? 'active' : 'pending',
            system_roles       : roles,
            granted_by         : auto_approve ? user.id : null,
            granted_at         : auto_approve ? new Date() : null,
            creator_id         : user.id,
        } as any);

        await this.externalLinksModel.create({
            user_id      : user.id,
            system_id,
            external_id,
            external_type: 'internal',
            creator_id   : user.id,
        } as any);

        // Sync Keycloak roles
        if (auto_approve && user.keycloak_id && system.keycloak_client_id) {
            for (const role of roles) {
                try {
                    await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role);
                } catch (err: any) {
                    this.logger.warn(`Keycloak role sync failed for '${role}': ${err.message}`);
                }
            }
        }

        const sep = redirect_uri.includes('?') ? '&' : '?';
        const redirect_url = `${redirect_uri}${sep}linked=true&platform_user_id=${user.id}`;

        this.logger.log(`Redirect link completed: user=${user.id} system=${system_id}`);
        return { redirect_url };
    }

}