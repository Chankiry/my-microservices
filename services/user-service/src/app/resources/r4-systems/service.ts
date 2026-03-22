import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import System     from '../../../models/system/system.model';
import SystemRole from '../../../models/system/system-role.model';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { CreateSystemDto, UpdateSystemDto, CreateSystemRoleDto } from './dto';
import { UserService } from '../r2-user/service';

@Injectable()
export class SystemService {
    private readonly logger = new Logger(SystemService.name);

    constructor(
        @InjectModel(System)
        private readonly systemModel     : typeof System,
        @InjectModel(SystemRole)
        private readonly systemRoleModel : typeof SystemRole,
        private readonly keycloakAdmin   : KeycloakAdminService,
        private readonly userService     : UserService,
    ) {}

    // ─── System CRUD ──────────────────────────────────────────────────────────

    async findAll(): Promise<any> {
        const data = await this.systemModel.findAll({ order: [['created_at', 'ASC']] });
        return {
            data
        }
    }

    async findById(id: string): Promise<System> {
        const system = await this.systemModel.findOne({ where: { id } });
        if (!system) throw new NotFoundException(`System '${id}' not found`);
        return system;
    }

    async create(dto: CreateSystemDto, user_id: string): Promise<System> {
        const existing = await this.systemModel.findOne({ where: { id: dto.id } });
        if (existing) throw new ConflictException(`System '${dto.id}' already exists`);

        const user = await this.userService.findByKeycloakId(user_id);

        const system = await this.systemModel.create({
            ...dto,
            creator_id: user.id,
            allow_self_register : dto.allow_self_register ?? false,
            require_approval    : dto.require_approval    ?? false,
            is_internal         : dto.is_internal         ?? false,
            is_active           : true,
        } as any);

        this.logger.log(`System created: ${system.id}`);
        return system;
    }

    async update(id: string, dto: UpdateSystemDto, user_id: string): Promise<System> {
        const system = await this.findById(id);
        const user = await this.userService.findByKeycloakId(user_id);

        const keycloak_changed =
            (dto.name        !== undefined && dto.name        !== system.name)        ||
            (dto.description !== undefined && dto.description !== system.description);

        if (keycloak_changed && system.keycloak_client_id) {
            await this.keycloakAdmin.updateClientInfo(system.keycloak_client_id, {
                name       : dto.name,
                description: dto.description,
            });
        }

        Object.assign(system, dto);
        system.updater_id = user.id;
        await system.save();

        this.logger.log(`System updated: ${id}`);
        return system;
    }

    async remove(id: string, user_id: string): Promise<void> {
        const system = await this.findById(id);
        const user = await this.userService.findByKeycloakId(user_id);
        system.deleter_id = user.id;
        await system.save();
        await system.destroy();
        this.logger.log(`System soft-deleted: ${id}`);
    }

    // ─── System roles ─────────────────────────────────────────────────────────

    async findRoles(system_id: string): Promise<SystemRole[]> {
        await this.findById(system_id); // throws if system not found
        return this.systemRoleModel.findAll({
            where: { system_id },
            order: [['role_name', 'ASC']],
        });
    }

    async findRoleNames(system_id: string): Promise<string[]> {
        const roles = await this.findRoles(system_id);
        return roles.map(r => r.role_name);
    }

    async createRole(
        system_id  : string,
        dto        : CreateSystemRoleDto,
        user_id : string,
    ): Promise<SystemRole> {
        const system = await this.findById(system_id);

        const existing = await this.systemRoleModel.findOne({
            where: { system_id, role_name: dto.role_name },
        });
        if (existing) {
            throw new ConflictException(
                `Role '${dto.role_name}' already exists in system '${system_id}'`,
            );
        }

        // Create in Keycloak first — if that fails we don't want a DB row
        // pointing to a role that doesn't exist in Keycloak
        if (system.keycloak_client_id) {
            try {
                await this.keycloakAdmin.createClientRole(
                    system.keycloak_client_id,
                    dto.role_name,
                    dto.description,
                );
            } catch (err: any) {
                // Role already exists in Keycloak — that is fine, continue
                if (err?.response?.status === 409 || err?.message?.includes('already exists')) {
                    this.logger.warn(`Role '${dto.role_name}' already exists in Keycloak — skipping creation`);
                } else {
                    throw err;
                }
            }
        }

        const user = await this.userService.findByKeycloakId(user_id);

        const role = await this.systemRoleModel.create({
            system_id,
            role_name  : dto.role_name,
            description: dto.description || null,
            is_default : dto.is_default  ?? false,
            creator_id: user.id,
        } as any);

        this.logger.log(`Role '${dto.role_name}' created in system '${system_id}'`);
        return role;
    }

    async removeRole(
        system_id  : string,
        role_name  : string,
        user_id : string,
    ): Promise<void> {
        const system = await this.findById(system_id);

        const role = await this.systemRoleModel.findOne({
            where: { system_id, role_name },
        });
        if (!role) throw new NotFoundException(`Role '${role_name}' not found in system '${system_id}'`);

        // Remove from Keycloak first
        if (system.keycloak_client_id) {
            await this.keycloakAdmin.deleteClientRole(system.keycloak_client_id, role_name);
        }

        const user = await this.userService.findByKeycloakId(user_id);

        role.deleter_id = user.id;
        await role.save();
        await role.destroy();

        this.logger.log(`Role '${role_name}' removed from system '${system_id}'`);
    }
}