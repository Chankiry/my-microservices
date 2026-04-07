import {
    Injectable, Logger, NotFoundException,
    ConflictException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel }          from '@nestjs/sequelize';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { UserService }          from '../r2-user/service';
import { SystemService }        from '../r4-systems/service';
import UserSystemAccess         from '../../../models/user/user-system-access.model';
import UserSystemRole           from '../../../models/user/user-system-role.model';
import UserLoginLog             from '../../../models/user/user-login-log.model';
import SystemRole               from '../../../models/system/system-role.model';
import User                     from '../../../models/user/user.model';
import System                   from '../../../models/system/system.model';
import {
    GrantAccessDto, UpdateAccessDto, RejectAccessDto,
    ExternalRoleChangeDto, AssignUserRoleDto, CreatePlatformUserDto,
} from './dto';
import { ConfigService } from '@nestjs/config';
import { UserSystemAccessRegistrationStatusEnum } from '@app/shared/enums/System.enum';

@Injectable()
export class ManagementService {
    private readonly logger = new Logger(ManagementService.name);
    private readonly system_id      : string;

    constructor(
        @InjectModel(UserSystemAccess)
        private readonly accessModel         : typeof UserSystemAccess,
        @InjectModel(UserSystemRole)
        private readonly userSystemRoleModel : typeof UserSystemRole,
        @InjectModel(UserLoginLog)
        private readonly loginLogModel       : typeof UserLoginLog,
        @InjectModel(SystemRole)
        private readonly systemRoleModel     : typeof SystemRole,
        private readonly userService         : UserService,
        private readonly systemService       : SystemService,
        private readonly keycloakAdmin       : KeycloakAdminService,
        private readonly configService       : ConfigService,
    ) {
        this.system_id  = this.configService.get('SYSTEM_ID', 'mlmupc-account-system');
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private async resolveUserId(keycloak_id: string): Promise<string> {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException(`User not found for keycloak_id: ${keycloak_id}`);
        return user.id;
    }

    private async checkPlatformAdmin(keycloak_id: string): Promise<string> {
        const user = await this.userService.findByKeycloakId(keycloak_id);
        if (!user) throw new NotFoundException('User not found');

        const adminRole = await this.systemRoleModel.findOne({
            where: { system_id: this.system_id, slug: 'admin', is_active: true },
        });
        if (!adminRole) throw new ForbiddenException('Platform admin role not configured');

        const isAdmin = await this.userSystemRoleModel.findOne({
            where: { user_id: user.id, role_id: adminRole.id },
        });
        if (!isAdmin) throw new ForbiddenException('Access denied: platform admin only');

        return user.id;
    }

    private async findAccess(user_id: string, system_id: string): Promise<UserSystemAccess> {
        const access = await this.accessModel.findOne({ where: { user_id, system_id } });
        if (!access) throw new NotFoundException(`No access record for user=${user_id} system=${system_id}`);
        return access;
    }

    // ─── Users Overview ───────────────────────────────────────────────────────

    async findAllUsers(query: { page?: number; limit?: number; search?: string }) {
        const page   = query.page  || 1;
        const limit  = query.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = {};
        if (query.search) {
            const { Op } = await import('sequelize');
            where[Op.or] = [
                { phone     : { [Op.iLike]: `%${query.search}%` } },
                { email     : { [Op.iLike]: `%${query.search}%` } },
                { first_name: { [Op.iLike]: `%${query.search}%` } },
                { last_name : { [Op.iLike]: `%${query.search}%` } },
            ];
        }

        const { count, rows } = await User.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
        return { data: rows, total: count, page, limit };
    }

    async findUserById(user_id: string) {
        const user = await this.userService.findById(user_id);

        const platformRoles = await this.userSystemRoleModel.findAll({
            where  : { user_id, system_id: this.system_id },
            include: [{ model: SystemRole, as: 'role' }],
        });

        const allAccess = await this.accessModel.findAll({
            where  : { user_id },
            include: [{ model: System, as: 'system' }],
        });

        return {
            ...user.toJSON(),
            platform_roles : platformRoles.map(ur => ur.role),
            system_access  : allAccess,
        };
    }

    // ─── Admin User Creation ──────────────────────────────────────────────────

    async createPlatformUser(dto: CreatePlatformUserDto, requester_keycloak_id: string) {
        const requester_id = await this.checkPlatformAdmin(requester_keycloak_id);

        // Create in Keycloak
        const keycloak_id = await this.keycloakAdmin.createUser({
            username : dto.phone,
            email    : dto.email,
            first_name: dto.first_name,
            last_name : dto.last_name,
            is_active  : true,
        });

        await this.keycloakAdmin.setPassword(keycloak_id, dto.password);
        await this.keycloakAdmin.assignRealmRole(keycloak_id, 'user');

        // Create in DB
        const user = await User.create({
            keycloak_id,
            phone     : dto.phone,
            email     : dto.email      || null,
            first_name: dto.first_name || null,
            last_name : dto.last_name  || null,
            is_active : true,
            creator_id: requester_id,
        } as any);

        // Assign platform role
        const roleSlug = dto.platform_role || 'user';
        const role = await this.systemRoleModel.findOne({
            where: { system_id: this.system_id, slug: roleSlug, is_active: true },
        });

        if (role) {
            await this.userSystemRoleModel.create({
                user_id   : user.id,
                system_id : this.system_id,
                role_id   : role.id,
                granted_by: requester_id,
                granted_at: new Date(),
                creator_id: requester_id,
            } as any);

            // Sync to Keycloak realm if needed
            if (role.keycloak_role_name && role.role_type === 'realm' && roleSlug !== 'user') {
                await this.keycloakAdmin.assignRealmRole(keycloak_id, role.keycloak_role_name);
            }
        }

        this.logger.log(`Platform user created: ${user.id} by admin=${requester_id}`);
        return user;
    }

    // ─── User Role Assignment ─────────────────────────────────────────────────

    async getUserRoles(user_id: string, system_id?: string) {
        const where: any = { user_id };
        if (system_id) where.system_id = system_id;

        return this.userSystemRoleModel.findAll({
            where,
            include: [
                { model: SystemRole, as: 'role' },
                { model: System,     as: 'system' },
            ],
            order: [['created_at', 'ASC']],
        });
    }

    async assignRoleToUser(
        user_id              : string,
        dto                  : AssignUserRoleDto,
        requester_keycloak_id: string,
    ): Promise<UserSystemRole> {
        await this.checkPlatformAdmin(requester_keycloak_id);

        const user = await this.userService.findById(user_id);
        const role = await this.systemRoleModel.findOne({
            where: { id: dto.role_id, is_active: true },
        });
        if (!role) throw new NotFoundException('Role not found');

        await this.systemService.findById(role.system_id); // validate system exists

        const existing = await this.userSystemRoleModel.findOne({
            where: { user_id, role_id: dto.role_id },
        });
        if (existing) throw new ConflictException('Role already assigned to this user');

        const requester_id = await this.resolveUserId(requester_keycloak_id);

        const userSystemRole = await this.userSystemRoleModel.create({
            user_id,
            system_id : role.system_id,
            role_id   : dto.role_id,
            granted_by: requester_id,
            granted_at: new Date(),
            creator_id: requester_id,
        } as any);

        // Sync to Keycloak
        if (user.keycloak_id && role.keycloak_role_name) {
            try {
                if (role.role_type === 'realm') {
                    await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                } else {
                    const system = await this.systemService.findById(role.system_id);
                    if (system.keycloak_client_id) {
                        await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                    }
                }
            } catch (err: any) {
                this.logger.warn(`Keycloak sync failed for role '${role.slug}': ${err.message}`);
            }
        }

        this.logger.log(`Role '${role.slug}' assigned: user=${user_id} by admin=${requester_id}`);
        return userSystemRole;
    }

    async revokeRoleFromUser(
        user_id              : string,
        role_id              : string,
        requester_keycloak_id: string,
    ): Promise<void> {
        await this.checkPlatformAdmin(requester_keycloak_id);

        const user = await this.userService.findById(user_id);
        const userSystemRole = await this.userSystemRoleModel.findOne({
            where  : { user_id, role_id },
            include: [{ model: SystemRole, as: 'role' }],
        });
        if (!userSystemRole) throw new NotFoundException('Role assignment not found');

        const requester_id = await this.resolveUserId(requester_keycloak_id);
        userSystemRole.deleter_id = requester_id;
        await userSystemRole.save();
        await userSystemRole.destroy();

        // Revoke in Keycloak
        const role = userSystemRole.role;
        if (user.keycloak_id && role?.keycloak_role_name) {
            try {
                if (role.role_type === 'realm') {
                    await this.keycloakAdmin.revokeRealmRole(user.keycloak_id, role.keycloak_role_name);
                } else {
                    const system = await this.systemService.findById(role.system_id);
                    if (system.keycloak_client_id) {
                        await this.keycloakAdmin.revokeClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                    }
                }
            } catch (err: any) {
                this.logger.warn(`Keycloak revoke failed for role '${role.slug}': ${err.message}`);
            }
        }

        this.logger.log(`Role '${role?.slug}' revoked: user=${user_id}`);
    }

    // ─── Access Management ────────────────────────────────────────────────────

    async findSystemUsers(system_id: string, query: { page?: number; limit?: number; status?: string }) {
        await this.systemService.findById(system_id);
        const page   = query.page  || 1;
        const limit  = query.limit || 20;
        const offset = (page - 1) * limit;

        const where: any = { system_id };
        if (query.status) where.registration_status = query.status;

        const { count, rows } = await this.accessModel.findAndCountAll({
            where,
            include: [{ model: User, as: 'user' }],
            limit, offset, order: [['created_at', 'DESC']],
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

    async grantAccess(user_id: string, dto: GrantAccessDto, requester_keycloak_id: string) {
        await this.checkPlatformAdmin(requester_keycloak_id);

        const user       = await this.userService.findById(user_id);
        const system     = await this.systemService.findById(dto.system_id);
        const creator_id = await this.resolveUserId(requester_keycloak_id);

        const existing = await this.accessModel.findOne({ where: { user_id, system_id: dto.system_id } });
        if (existing) throw new ConflictException(`User already has a '${existing.registration_status}' access record`);

        const auto_approve = !system.require_approval;
        const access = await this.accessModel.create({
            user_id,
            system_id          : dto.system_id,
            account_type       : dto.account_type,
            registration_status: auto_approve ? 'active' : 'pending',
            granted_by         : auto_approve ? creator_id : null,
            granted_at         : auto_approve ? new Date()  : null,
            creator_id,
        } as any);

        // Assign default roles
        if (auto_approve) {
            const defaultRoles = await this.systemService.findDefaultRoles(dto.system_id);
            for (const role of defaultRoles) {
                await this.userSystemRoleModel.create({
                    user_id, system_id: dto.system_id, role_id: role.id,
                    granted_by: creator_id, granted_at: new Date(), creator_id,
                } as any);

                if (user.keycloak_id && role.keycloak_role_name) {
                    try {
                        if (role.role_type === 'realm') {
                            await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                        } else if (system.keycloak_client_id) {
                            await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                        }
                    } catch (err: any) {
                        this.logger.warn(`Role sync failed: ${err.message}`);
                    }
                }
            }
        }

        return access;
    }

    async updateAccess(
        user_id              : string,
        system_id            : string,
        dto                  : UpdateAccessDto,
        requester_keycloak_id: string,
    ) {
        await this.checkPlatformAdmin(requester_keycloak_id);
        const access     = await this.findAccess(user_id, system_id);
        const updater_id = await this.resolveUserId(requester_keycloak_id);

        Object.assign(access, dto);
        access.updater_id = updater_id;
        await access.save();
        return access;
    }

    async revokeAccess(user_id: string, system_id: string, requester_keycloak_id: string): Promise<void> {
        await this.checkPlatformAdmin(requester_keycloak_id);
        const access     = await this.findAccess(user_id, system_id);
        const user       = await this.userService.findById(user_id);
        const system     = await this.systemService.findById(system_id);
        const deleter_id = await this.resolveUserId(requester_keycloak_id);

        // Revoke all roles for this system
        const userRoles = await this.userSystemRoleModel.findAll({
            where  : { user_id, system_id },
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
                    this.logger.warn(`Revoke role failed: ${err.message}`);
                }
            }
            ur.deleter_id = deleter_id;
            await ur.save();
            await ur.destroy();
        }

        access.deleter_id = deleter_id;
        await access.save();
        await access.destroy();
    }

    async approveAccess(user_id: string, system_id: string, requester_keycloak_id: string) {
        await this.checkPlatformAdmin(requester_keycloak_id);
        const access      = await this.findAccess(user_id, system_id);
        const approver_id = await this.resolveUserId(requester_keycloak_id);

        if (access.registration_status !== 'pending') {
            throw new BadRequestException(`Access is '${access.registration_status}', not pending`);
        }

        access.registration_status = UserSystemAccessRegistrationStatusEnum.ACTIVE;
        access.granted_by          = approver_id;
        access.granted_at          = new Date();
        access.updater_id          = approver_id;
        await access.save();

        // Assign default roles now that it's approved
        const user         = await this.userService.findById(user_id);
        const system       = await this.systemService.findById(system_id);
        const defaultRoles = await this.systemService.findDefaultRoles(system_id);

        for (const role of defaultRoles) {
            const exists = await this.userSystemRoleModel.findOne({ where: { user_id, role_id: role.id } });
            if (!exists) {
                await this.userSystemRoleModel.create({
                    user_id, system_id, role_id: role.id,
                    granted_by: approver_id, granted_at: new Date(), creator_id: approver_id,
                } as any);

                if (user.keycloak_id && role.keycloak_role_name) {
                    try {
                        if (role.role_type === 'realm') {
                            await this.keycloakAdmin.assignRealmRole(user.keycloak_id, role.keycloak_role_name);
                        } else if (system.keycloak_client_id) {
                            await this.keycloakAdmin.assignClientRole(user.keycloak_id, system.keycloak_client_id, role.keycloak_role_name);
                        }
                    } catch (err: any) {
                        this.logger.warn(`Role sync on approve failed: ${err.message}`);
                    }
                }
            }
        }

        return access;
    }

    async rejectAccess(
        user_id              : string,
        system_id            : string,
        requester_keycloak_id: string,
        dto                  : RejectAccessDto,
    ) {
        await this.checkPlatformAdmin(requester_keycloak_id);
        const access      = await this.findAccess(user_id, system_id);
        const rejecter_id = await this.resolveUserId(requester_keycloak_id);

        if (access.registration_status !== 'pending') {
            throw new BadRequestException(`Access is '${access.registration_status}', not pending`);
        }

        access.registration_status = UserSystemAccessRegistrationStatusEnum.REJECTED;
        access.rejected_by         = rejecter_id;
        access.rejected_at         = new Date();
        access.rejected_reason     = dto.reason || null;
        access.updater_id          = rejecter_id;
        await access.save();
        return access;
    }

    // ─── External System Role Sync ────────────────────────────────────────────

    async updateSystemRolesFromExternal(
        system_id            : string,
        external_id          : string,
        role_slugs           : string[],
        requester_keycloak_id: string,
    ) {
        // Dynamic import to avoid circular dep
        const UserExternalLinks = (await import('../../../models/user/user-external-links.model')).default;
        const link = await UserExternalLinks.findOne({ where: { system_id, external_id } });
        if (!link) throw new NotFoundException(`No external link for external_id='${external_id}' in system='${system_id}'`);

        const requester_id = await this.resolveUserId(requester_keycloak_id);

        // Find the requested roles by slug
        const targetRoles = await this.systemRoleModel.findAll({
            where: { system_id, slug: role_slugs, is_active: true },
        });

        // Current roles
        const currentUserRoles = await this.userSystemRoleModel.findAll({
            where  : { user_id: link.user_id, system_id },
            include: [{ model: SystemRole, as: 'role' }],
        });

        const targetRoleIds  = targetRoles.map(r => r.id);
        const currentRoleIds = currentUserRoles.map(ur => ur.role_id);

        // Add new roles
        for (const role of targetRoles) {
            if (!currentRoleIds.includes(role.id)) {
                await this.userSystemRoleModel.create({
                    user_id: link.user_id, system_id, role_id: role.id,
                    granted_by: requester_id, granted_at: new Date(), creator_id: requester_id,
                } as any);
            }
        }

        // Remove old roles
        for (const ur of currentUserRoles) {
            if (!targetRoleIds.includes(ur.role_id)) {
                ur.deleter_id = requester_id;
                await ur.save();
                await ur.destroy();
            }
        }
    }

    // ─── Login History ────────────────────────────────────────────────────────

    async recordLogin(user_id: string, system_id: string, ip?: string, user_agent?: string) {
        await this.loginLogModel.create({ user_id, system_id, ip, user_agent } as any);
        await this.accessModel.update({ last_login_at: new Date() }, { where: { user_id, system_id } });
    }

    async findLoginHistory(user_id: string, system_id?: string, limit = 50) {
        const where: any = { user_id };
        if (system_id) where.system_id = system_id;
        return this.loginLogModel.findAll({
            where,
            include: [{ model: System, as: 'system' }],
            limit,
            order  : [['created_at', 'DESC']],
        });
    }
}