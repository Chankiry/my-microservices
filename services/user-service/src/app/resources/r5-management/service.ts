import {
    Injectable, Logger, NotFoundException,
    ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { UserService } from '../r2-user/service';
import { AppService } from '../r4-apps/service';
import UserAppAccess from '../../../models/user/user-app-access.model';
import UserLoginLog  from '../../../models/user/user-login-log.model';
import User          from '../../../models/user/user.model';
import App           from '../../../models/system/system.model';
import { GrantAccessDto, UpdateAccessDto, RejectAccessDto } from './dto';

@Injectable()
export class ManagementService {
    private readonly logger = new Logger(ManagementService.name);

    constructor(
        @InjectModel(UserAppAccess)
        private readonly accessModel    : typeof UserAppAccess,
        @InjectModel(UserLoginLog)
        private readonly loginLogModel  : typeof UserLoginLog,
        private readonly userService    : UserService,
        private readonly appService     : AppService,
        private readonly keycloakAdmin  : KeycloakAdminService,
    ) {}

    // ─── Users overview ───────────────────────────────────────────────────────

    // All users with a summary of how many apps they can access
    async findAllUsers(query: {
        page?   : number;
        limit?  : number;
        search? : string;
    }) {
        const result = await this.userService.findAll({
            page  : query.page,
            limit : query.limit,
            search: query.search,
        });

        // Attach app access count to each user
        const user_ids = result.data.map(u => u.id);
        const access_rows = await this.accessModel.findAll({
            where: {
                user_id             : user_ids,
                registration_status : 'active',
            },
        });

        const access_map: Record<string, number> = {};
        for (const row of access_rows) {
            access_map[row.user_id] = (access_map[row.user_id] || 0) + 1;
        }

        return {
            ...result,
            data: result.data.map(u => ({
                ...u.toJSON(),
                app_access_count: access_map[u.id] || 0,
            })),
        };
    }

    // Single user with all their app access details
    async findUserDetail(user_id: string) {
        const user   = await this.userService.findById(user_id);
        const access = await this.accessModel.findAll({
            where  : { user_id },
            include: [{ model: App, as: 'app' }],
            order  : [['created_at', 'ASC']],
        });

        return {
            ...user.toJSON(),
            app_access: access,
        };
    }

    // ─── App-scoped views ─────────────────────────────────────────────────────

    async findAppUsers(app_id: string, query: {
        page?   : number;
        limit?  : number;
        status? : string;
    }) {
        await this.appService.findById(app_id); // throws if not found

        const page   = query.page  || 1;
        const limit  = query.limit || 20;
        const offset = (page - 1) * limit;
        const where: any = { app_id };
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

    async findPendingApprovals(app_id: string) {
        await this.appService.findById(app_id);

        return this.accessModel.findAll({
            where  : { app_id, registration_status: 'pending' },
            include: [{ model: User, as: 'user' }],
            order  : [['created_at', 'ASC']],
        });
    }

    // ─── Grant / revoke ───────────────────────────────────────────────────────

    async grantAccess(
        user_id   : string,
        dto       : GrantAccessDto,
        granter_id: string,
    ): Promise<UserAppAccess> {
        const user = await this.userService.findById(user_id);
        await this.appService.findById(dto.app_id);

        const existing = await this.accessModel.findOne({
            where: { user_id, app_id: dto.app_id },
        });
        if (existing) {
            throw new ConflictException(
                `User already has a ${existing.registration_status} access record for app '${dto.app_id}'`,
            );
        }

        // Determine initial status based on app config
        const app             = await this.appService.findById(dto.app_id);
        const auto_approve    = !app.require_approval;
        const initial_status  = auto_approve ? 'active' : 'pending';

        const access = await this.accessModel.create({
            user_id,
            app_id             : dto.app_id,
            account_type       : dto.account_type,
            registration_status: initial_status,
            app_roles          : dto.app_roles || [],
            granted_by         : auto_approve ? granter_id : null,
            granted_at         : auto_approve ? new Date()  : null,
            creator_id         : granter_id,
        } as any);

        // If auto-approved, assign Keycloak client roles immediately
        if (auto_approve && user.keycloak_id && dto.app_roles?.length) {
            await this.assignKeycloakRoles(
                user.keycloak_id,
                dto.app_id,
                dto.app_roles,
            );
        }

        this.logger.log(`Access granted: user=${user_id} app=${dto.app_id} status=${initial_status}`);
        return access;
    }

    async updateAccess(
        user_id   : string,
        app_id    : string,
        dto       : UpdateAccessDto,
        updater_id: string,
    ): Promise<UserAppAccess> {
        const access = await this.findAccess(user_id, app_id);
        const user   = await this.userService.findById(user_id);

        // If roles are changing, update Keycloak client roles
        if (dto.app_roles && user.keycloak_id) {
            await this.revokeKeycloakRoles(user.keycloak_id, app_id, access.app_roles);
            await this.assignKeycloakRoles(user.keycloak_id, app_id, dto.app_roles);
        }

        Object.assign(access, dto);
        access.updater_id = updater_id;
        await access.save();

        this.logger.log(`Access updated: user=${user_id} app=${app_id}`);
        return access;
    }

    async revokeAccess(
        user_id   : string,
        app_id    : string,
        deleter_id: string,
    ): Promise<void> {
        const access = await this.findAccess(user_id, app_id);
        const user   = await this.userService.findById(user_id);

        // Remove all Keycloak client roles for this app
        if (user.keycloak_id && access.app_roles.length) {
            await this.revokeKeycloakRoles(user.keycloak_id, app_id, access.app_roles);
        }

        access.deleter_id = deleter_id;
        await access.save();
        await access.destroy();

        this.logger.log(`Access revoked: user=${user_id} app=${app_id}`);
    }

    // ─── Approval workflow ────────────────────────────────────────────────────

    async approveAccess(
        user_id    : string,
        app_id     : string,
        approver_id: string,
    ): Promise<UserAppAccess> {
        const access = await this.findAccess(user_id, app_id);

        if (access.registration_status !== 'pending') {
            throw new BadRequestException(
                `Access is '${access.registration_status}', not pending`,
            );
        }

        const user = await this.userService.findById(user_id);

        // Assign Keycloak client roles now that approval is granted
        if (user.keycloak_id && access.app_roles.length) {
            await this.assignKeycloakRoles(user.keycloak_id, app_id, access.app_roles);
        }

        access.registration_status = 'active';
        access.granted_by          = approver_id;
        access.granted_at          = new Date();
        access.updater_id          = approver_id;
        await access.save();

        this.logger.log(`Access approved: user=${user_id} app=${app_id} by=${approver_id}`);
        return access;
    }

    async rejectAccess(
        user_id    : string,
        app_id     : string,
        rejecter_id: string,
        dto        : RejectAccessDto,
    ): Promise<UserAppAccess> {
        const access = await this.findAccess(user_id, app_id);

        if (access.registration_status !== 'pending') {
            throw new BadRequestException(
                `Access is '${access.registration_status}', not pending`,
            );
        }

        access.registration_status = 'rejected';
        access.rejected_by         = rejecter_id;
        access.rejected_at         = new Date();
        access.rejected_reason     = dto.reason || null;
        access.updater_id          = rejecter_id;
        await access.save();

        this.logger.log(`Access rejected: user=${user_id} app=${app_id}`);
        return access;
    }

    // ─── Login tracking ───────────────────────────────────────────────────────

    async recordLogin(
        user_id   : string,
        app_id    : string,
        ip?       : string,
        user_agent?: string,
    ): Promise<void> {
        await this.loginLogModel.create({
            user_id, app_id, ip, user_agent,
        } as any);

        // Update last_login_at on the access record
        await this.accessModel.update(
            { last_login_at: new Date() },
            { where: { user_id, app_id } },
        );

        this.logger.log(`Login recorded: user=${user_id} app=${app_id}`);
    }

    async findLoginHistory(
        user_id: string,
        app_id? : string,
        limit   : number = 50,
    ) {
        const where: any = { user_id };
        if (app_id) where.app_id = app_id;

        return this.loginLogModel.findAll({
            where,
            include: [{ model: App, as: 'app' }],
            limit,
            order  : [['created_at', 'DESC']],
        });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private async findAccess(user_id: string, app_id: string): Promise<UserAppAccess> {
        const access = await this.accessModel.findOne({ where: { user_id, app_id } });
        if (!access) {
            throw new NotFoundException(
                `No access record for user=${user_id} app=${app_id}`,
            );
        }
        return access;
    }

    private async assignKeycloakRoles(
        keycloak_id: string,
        app_id     : string,
        roles      : string[],
    ): Promise<void> {
        for (const role of roles) {
            try {
                await this.keycloakAdmin.assignClientRole(keycloak_id, app_id, role);
            } catch (err: any) {
                this.logger.warn(
                    `Could not assign role '${role}' in app '${app_id}' for ${keycloak_id}: ${err.message}`,
                );
            }
        }
    }

    private async revokeKeycloakRoles(
        keycloak_id: string,
        app_id     : string,
        roles      : string[],
    ): Promise<void> {
        for (const role of roles) {
            try {
                await this.keycloakAdmin.revokeClientRole(keycloak_id, app_id, role);
            } catch (err: any) {
                this.logger.warn(
                    `Could not revoke role '${role}' in app '${app_id}' for ${keycloak_id}: ${err.message}`,
                );
            }
        }
    }
}