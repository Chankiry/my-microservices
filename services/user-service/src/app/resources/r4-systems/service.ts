import {
    Injectable, Logger,
    NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectModel }          from '@nestjs/sequelize';
import System                   from '../../../models/system/system.model';
import SystemRole               from '../../../models/system/system-role.model';
import { KeycloakAdminService } from '../../communications/keycloak/keycloak-admin.service';
import { UserService }          from '../r2-user/service';
import { CreateSystemDto, UpdateSystemDto, CreateSystemRoleDto, UpdateSystemRoleDto } from './dto';

@Injectable()
export class SystemService {
    private readonly logger = new Logger(SystemService.name);

    constructor(
        @InjectModel(System)
        private readonly systemModel    : typeof System,
        @InjectModel(SystemRole)
        private readonly systemRoleModel: typeof SystemRole,
        private readonly keycloakAdmin  : KeycloakAdminService,
        private readonly userService    : UserService,
    ) {}

    // ─── System CRUD ──────────────────────────────────────────────────────────

    async findAll(): Promise<System[]> {
        return this.systemModel.findAll({ order: [['name', 'ASC']] });
    }

    async findById(id: string): Promise<System> {
        const system = await this.systemModel.findOne({ where: { id } });
        if (!system) throw new NotFoundException(`System '${id}' not found`);
        return system;
    }

    async create(dto: CreateSystemDto, user_keycloak_id: string): Promise<System> {
        const existing = await this.systemModel.findOne({ where: { id: dto.id } });
        if (existing) throw new ConflictException(`System '${dto.id}' already exists`);

        const user = await this.userService.findByKeycloakId(user_keycloak_id);

        const system = await this.systemModel.create({
            ...dto,
            is_active           : true,
            allow_self_register : dto.allow_self_register ?? false,
            require_approval    : dto.require_approval    ?? false,
            is_internal         : dto.is_internal         ?? false,
            creator_id          : user.id,
        } as any);

        this.logger.log(`System created: ${system.id}`);
        return system;
    }

    async update(id: string, dto: UpdateSystemDto, user_keycloak_id: string): Promise<System> {
        const system = await this.findById(id);
        const user   = await this.userService.findByKeycloakId(user_keycloak_id);

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

    async remove(id: string, user_keycloak_id: string): Promise<void> {
        const system = await this.findById(id);
        const user   = await this.userService.findByKeycloakId(user_keycloak_id);
        system.deleter_id = user.id;
        await system.save();
        await system.destroy();
        this.logger.log(`System soft-deleted: ${id}`);
    }

    // ─── System Roles ─────────────────────────────────────────────────────────

    async findRoles(system_id: string): Promise<SystemRole[]> {
        await this.findById(system_id);
        return this.systemRoleModel.findAll({
            where: { system_id },
            order: [['name_en', 'ASC']],
        });
    }

    // Returns full SystemRole objects for roles that are auto-assigned on connect
    async findDefaultRoles(system_id: string): Promise<SystemRole[]> {
        return this.systemRoleModel.findAll({
            where: { system_id, is_default: true, is_active: true },
        });
    }

    async findRoleBySlug(system_id: string, slug: string): Promise<SystemRole | null> {
        return this.systemRoleModel.findOne({ where: { system_id, slug } });
    }

    async createRole(
        system_id         : string,
        dto               : CreateSystemRoleDto,
        user_keycloak_id  : string,
    ): Promise<SystemRole> {
        const system = await this.findById(system_id);

        // Slug must be unique within this system
        const existing = await this.systemRoleModel.findOne({
            where: { system_id, slug: dto.slug },
        });
        if (existing) {
            throw new ConflictException(`Role '${dto.slug}' already exists in system '${system_id}'`);
        }

        // Sync to Keycloak client if applicable
        if (system.keycloak_client_id && dto.keycloak_role_name && dto.role_type === 'client') {
            try {
                await this.keycloakAdmin.createClientRole(
                    system.keycloak_client_id,
                    dto.keycloak_role_name,
                    dto.description,
                );
            } catch (err: any) {
                if (err?.response?.status === 409 || err?.message?.includes('already exists')) {
                    this.logger.warn(`Role '${dto.keycloak_role_name}' already exists in Keycloak — skipping`);
                } else {
                    throw err;
                }
            }
        }

        const user = await this.userService.findByKeycloakId(user_keycloak_id);

        const role = await this.systemRoleModel.create({
            system_id,
            name_kh           : dto.name_kh,
            name_en           : dto.name_en,
            slug              : dto.slug,
            icon              : dto.icon              || null,
            color             : dto.color             || null,
            description       : dto.description       || null,
            role_type         : dto.role_type,
            keycloak_role_name: dto.keycloak_role_name || null,
            is_default        : dto.is_default         ?? false,
            is_active         : true,
            creator_id        : user.id,
        } as any);

        this.logger.log(`Role '${dto.slug}' created in system '${system_id}'`);
        return role;
    }

    async updateRole(
        system_id        : string,
        slug             : string,
        dto              : UpdateSystemRoleDto,
        user_keycloak_id : string,
    ): Promise<SystemRole> {
        const role = await this.systemRoleModel.findOne({ where: { system_id, slug } });
        if (!role) throw new NotFoundException(`Role '${slug}' not found in system '${system_id}'`);

        const user = await this.userService.findByKeycloakId(user_keycloak_id);
        Object.assign(role, dto);
        role.updater_id = user.id;
        await role.save();

        this.logger.log(`Role '${slug}' updated in system '${system_id}'`);
        return role;
    }

    async removeRole(
        system_id        : string,
        slug             : string,
        user_keycloak_id : string,
    ): Promise<void> {
        const system = await this.findById(system_id);
        const role   = await this.systemRoleModel.findOne({ where: { system_id, slug } });
        if (!role) throw new NotFoundException(`Role '${slug}' not found in system '${system_id}'`);

        // Remove from Keycloak client if applicable
        if (system.keycloak_client_id && role.keycloak_role_name && role.role_type === 'client') {
            await this.keycloakAdmin.deleteClientRole(system.keycloak_client_id, role.keycloak_role_name);
        }

        const user    = await this.userService.findByKeycloakId(user_keycloak_id);
        role.deleter_id = user.id;
        await role.save();
        await role.destroy();

        this.logger.log(`Role '${slug}' removed from system '${system_id}'`);
    }
}