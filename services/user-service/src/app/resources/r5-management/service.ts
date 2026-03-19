import {
    Injectable, Logger, NotFoundException,
    ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { UserService } from '../r2-user/service';
import { SystemService } from '../r4-systems/service';
import UserSystemAccess from '../../../models/user/user-system-access.model';
import UserLoginLog     from '../../../models/user/user-login-log.model';
import User             from '../../../models/user/user.model';
import System           from '../../../models/system/system.model';
import { GrantAccessDto, UpdateAccessDto, RejectAccessDto } from './dto';
import SystemRole from '@models/system/system-role.model';

@Injectable()
export class ManagementService {
    private readonly logger = new Logger(ManagementService.name);

    constructor(
        @InjectModel(UserSystemAccess)
        private readonly accessModel   : typeof UserSystemAccess,
        @InjectModel(UserLoginLog)
        private readonly loginLogModel : typeof UserLoginLog,
        @InjectModel(SystemRole)
        private readonly systemRoleModel: typeof SystemRole,
        private readonly userService   : UserService,
        private readonly systemService : SystemService,
        private readonly keycloakAdmin : KeycloakAdminService,
    ) {}

    // ─── Users overview ───────────────────────────────────────────────────────

    async findAllUsers(query: { page?: number; limit?: number; search?: string }) {
        const result = await this.userService.findAll({
            page  : query.page,
            limit : query.limit,
            search: query.search,
        });

        const user_ids    = result.data.map(u => u.id);
        const access_rows = await this.accessModel.findAll({
            where: { user_id: user_ids, registration_status: 'active' },
        });

        const access_map: Record<string, number> = {};
        for (const row of access_rows) {
            access_map[row.user_id] = (access_map[row.user_id] || 0) + 1;
        }

        return {
            ...result,
            data: result.data.map(u => ({
                ...u.toJSON(),
                system_access_count: access_map[u.id] || 0,
            })),
        };
    }

    async findUserDetail(user_id: string) {
        const user          = await this.userService.findById(user_id);
        const system_access = await this.accessModel.findAll({
            where  : { user_id },
            include: [{ model: System, as: 'system' }],
            order  : [['created_at', 'ASC']],
        });

        return { ...user.toJSON(), system_access };
    }

    // ─── System-scoped views ──────────────────────────────────────────────────

    async findSystemUsers(system_id: string, query: {
        page?  : number;
        limit? : number;
        status?: string;
    }) {
        await this.systemService.findById(system_id);

        const page   = query.page  || 1;
        const limit  = query.limit || 20;
        const offset = (page - 1) * limit;
        const where: any = { system_id };
        if (query.status) where.registration_status = query.status;

        const { count, rows } = await this.accessModel.findAndCountAll({
            where,
            include: [{ model: User, as: 'user' }],
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return { data: rows, total: count, page, limit };
    }

    async findPendingApprovals(system_id: string) {
        await this.systemService.findById(system_id);

        return this.accessModel.findAll({
            where  : { system_id, registration_status: 'pending' },
            include: [{ model: User, as: 'user' }],
            order  : [['created_at', 'ASC']],
        });
    }

    // ─── Grant / revoke ───────────────────────────────────────────────────────

    async grantAccess(
        user_id   : string,
        dto       : GrantAccessDto,
        granter_id: string,
    ): Promise<UserSystemAccess> {
        const user   = await this.userService.findById(user_id);
        const system = await this.systemService.findById(dto.system_id);

        const existing = await this.accessModel.findOne({
            where: { user_id, system_id: dto.system_id },
        });
        if (existing) {
            throw new ConflictException(
                `User already has a '${existing.registration_status}' access record for system '${dto.system_id}'`,
            );
        }

        // Validate requested roles exist in system_roles table
        const requested_roles = dto.system_roles || [];
        if (requested_roles.length > 0) {
            await this.validateRoles(dto.system_id, requested_roles);
        }

        // If no roles requested, auto-assign default roles for this system
        const roles_to_assign = requested_roles.length > 0
            ? requested_roles
            : await this.getDefaultRoles(dto.system_id);

        const auto_approve   = !system.require_approval;
        const initial_status = auto_approve ? 'active' : 'pending';

        const access = await this.accessModel.create({
            user_id,
            system_id          : dto.system_id,
            account_type       : dto.account_type,
            registration_status: initial_status,
            system_roles       : roles_to_assign,
            granted_by         : auto_approve ? granter_id : null,
            granted_at         : auto_approve ? new Date()  : null,
            creator_id         : granter_id,
        } as any);

        if (auto_approve && user.keycloak_id && roles_to_assign.length) {
            await this.syncKeycloakRoles(
                user.keycloak_id,
                system.keycloak_client_id,
                [],
                roles_to_assign,
            );
        }

        this.logger.log(`Access granted: user=${user_id} system=${dto.system_id} status=${initial_status}`);
        return access;
    }

    async updateAccess(
        user_id    : string,
        system_id  : string,
        dto        : UpdateAccessDto,
        updater_id : string,
    ): Promise<UserSystemAccess> {
        const access = await this.findAccess(user_id, system_id);
        const user   = await this.userService.findById(user_id);
        const system = await this.systemService.findById(system_id);

        if (dto.system_roles) {
            await this.validateRoles(system_id, dto.system_roles);

            if (user.keycloak_id) {
                await this.syncKeycloakRoles(
                    user.keycloak_id,
                    system.keycloak_client_id,
                    access.system_roles,
                    dto.system_roles,
                );
            }
        }

        Object.assign(access, dto);
        access.updater_id = updater_id;
        await access.save();

        this.logger.log(`Access updated: user=${user_id} system=${system_id}`);
        return access;
    }

    async updateSystemRolesFromExternal(
        system_id    : string,
        external_id  : string,
        new_roles    : string[],
        requester_id : string,    // the service account keycloak_id of the calling system
    ): Promise<UserSystemAccess> {
        // Find user by their external link
        const link = await this.findExternalLink(system_id, external_id);

        // Validate new roles
        await this.validateRoles(system_id, new_roles);

        // Update via the existing updateAccess flow
        return this.updateAccess(
            link.user_id,
            system_id,
            { system_roles: new_roles },
            requester_id,
        );
    }

    async revokeAccess(
        user_id    : string,
        system_id  : string,
        deleter_id : string,
    ): Promise<void> {
        const access = await this.findAccess(user_id, system_id);
        const user   = await this.userService.findById(user_id);
        const system = await this.systemService.findById(system_id);

        if (user.keycloak_id && access.system_roles.length) {
            await this.syncKeycloakRoles(
                user.keycloak_id,
                system.keycloak_client_id,
                access.system_roles,
                [],
            );
        }

        access.deleter_id = deleter_id;
        await access.save();
        await access.destroy();

        this.logger.log(`Access revoked: user=${user_id} system=${system_id}`);
    }

    // ─── Approval workflow ────────────────────────────────────────────────────

    async approveAccess(
        user_id     : string,
        system_id   : string,
        approver_id : string,
    ): Promise<UserSystemAccess> {
        const access = await this.findAccess(user_id, system_id);

        if (access.registration_status !== 'pending') {
            throw new BadRequestException(`Access is '${access.registration_status}', not pending`);
        }

        const user   = await this.userService.findById(user_id);
        const system = await this.systemService.findById(system_id);

        if (user.keycloak_id && access.system_roles.length) {
            await this.syncKeycloakRoles(
                user.keycloak_id,
                system.keycloak_client_id,
                [],
                access.system_roles,
            );
        }

        access.registration_status = 'active';
        access.granted_by          = approver_id;
        access.granted_at          = new Date();
        access.updater_id          = approver_id;
        await access.save();

        this.logger.log(`Access approved: user=${user_id} system=${system_id}`);
        return access;
    }

    async rejectAccess(
        user_id     : string,
        system_id   : string,
        rejecter_id : string,
        dto         : RejectAccessDto,
    ): Promise<UserSystemAccess> {
        const access = await this.findAccess(user_id, system_id);

        if (access.registration_status !== 'pending') {
            throw new BadRequestException(`Access is '${access.registration_status}', not pending`);
        }

        access.registration_status = 'rejected';
        access.rejected_by         = rejecter_id;
        access.rejected_at         = new Date();
        access.rejected_reason     = dto.reason || null;
        access.updater_id          = rejecter_id;
        await access.save();

        this.logger.log(`Access rejected: user=${user_id} system=${system_id}`);
        return access;
    }

    // ─── Login tracking ───────────────────────────────────────────────────────

    async recordLogin(
        user_id    : string,
        system_id  : string,
        ip?        : string,
        user_agent?: string,
    ): Promise<void> {
        await this.loginLogModel.create({ user_id, system_id, ip, user_agent } as any);

        await this.accessModel.update(
            { last_login_at: new Date() },
            { where: { user_id, system_id } },
        );

        this.logger.log(`Login recorded: user=${user_id} system=${system_id}`);
    }

    async findLoginHistory(
        user_id   : string,
        system_id?: string,
        limit      : number = 50,
    ) {
        const where: any = { user_id };
        if (system_id) where.system_id = system_id;

        return this.loginLogModel.findAll({
            where,
            include: [{ model: System, as: 'system' }],
            limit,
            order  : [['created_at', 'DESC']],
        });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async findAccess(user_id: string, system_id: string): Promise<UserSystemAccess> {
        const access = await this.accessModel.findOne({ where: { user_id, system_id } });
        if (!access) {
            throw new NotFoundException(`No access record for user=${user_id} system=${system_id}`);
        }
        return access;
    }

    // Syncs Keycloak client roles by revoking old ones and assigning new ones.
    // Skips entirely if the system has no keycloak_client_id (no dedicated client).
    private async syncKeycloakRoles(
        keycloak_id       : string,
        keycloak_client_id: string | null,
        old_roles         : string[],
        new_roles         : string[],
    ): Promise<void> {
        if (!keycloak_client_id) {
            this.logger.warn(`System has no keycloak_client_id — skipping role sync`);
            return;
        }

        for (const role of old_roles) {
            if (!new_roles.includes(role)) {
                try {
                    await this.keycloakAdmin.revokeClientRole(keycloak_id, keycloak_client_id, role);
                } catch (err: any) {
                    this.logger.warn(`Could not revoke role '${role}': ${err.message}`);
                }
            }
        }

        for (const role of new_roles) {
            if (!old_roles.includes(role)) {
                try {
                    await this.keycloakAdmin.assignClientRole(keycloak_id, keycloak_client_id, role);
                } catch (err: any) {
                    this.logger.warn(`Could not assign role '${role}': ${err.message}`);
                }
            }
        }
    }

    private async validateRoles(system_id: string, roles: string[]): Promise<void> {
        const valid_roles = await this.systemRoleModel.findAll({
            where: { system_id },
        });
        const valid_names = valid_roles.map(r => r.role_name);

        const invalid = roles.filter(r => !valid_names.includes(r));
        if (invalid.length > 0) {
            throw new BadRequestException(
                `Invalid roles for system '${system_id}': ${invalid.join(', ')}. ` +
                `Valid roles are: ${valid_names.join(', ')}`,
            );
        }
    }

    private async getDefaultRoles(system_id: string): Promise<string[]> {
        const defaults = await this.systemRoleModel.findAll({
            where: { system_id, is_default: true },
        });
        return defaults.map(r => r.role_name);
    }

    private async findExternalLink(system_id: string, external_id: string) {
        const UserExternalLinks = (await import('../../../models/user/user-external-links.model')).default;
        const link = await UserExternalLinks.findOne({
            where: { system_id, external_id },
        });
        if (!link) {
            throw new NotFoundException(
                `No external link found for external_id='${external_id}' in system='${system_id}'`,
            );
        }
        return link;
    }
}