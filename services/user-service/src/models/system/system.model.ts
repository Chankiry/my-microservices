import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt, DeletedAt,
    HasMany,
    BelongsToMany,
} from 'sequelize-typescript';
import User from '../user/user.model';
import { BaseModel } from '@models/baseModel';
import UserSystemAccess from '@models/user/user-system-access.model';
import SystemRole from './system-role.model';

@Table({
    tableName : 'systems',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class System extends BaseModel<System> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.STRING(50) })                                        declare id: string;

    // ============================================================================================ Foreign Keys

    // ============================================================================================ Fields
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare name_kh: string;
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare name_en: string;
    @Column({ type: DataType.STRING(50), allowNull: false })                                        declare abbre: string;
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare logo: string | null;
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare cover: string | null;
    @Column({ type: DataType.TEXT,        allowNull: true })                                        declare description_kh: string | null;
    @Column({ type: DataType.TEXT,        allowNull: true })                                        declare description_en: string | null;
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare allow_self_register: boolean;
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare require_approval: boolean;
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare is_internal: boolean;
    @Column({ type: DataType.BOOLEAN, defaultValue: true,  allowNull: false })                      declare is_active: boolean;

    // Keycloak client ID — if set, system validates tokens via Keycloak
    @Column({ type: DataType.STRING(100), allowNull: true })                                        declare keycloak_client_id: string | null;

    // URL user-service calls to validate system-local credentials
    // e.g. http://plt:3005/internal/auth/validate
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare auth_callback_url: string | null;

    // Base URL of the system — used for SSO navigation
    // e.g. http://localhost:3005 or https://plt.example.com
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare base_url: string | null;

    // URL on the integrated system's frontend where the user lands to confirm
    // account linking. Platform redirects here with ?platform_link_code=<hex>.
    // If null, falls back to {base_url}/platform/link by convention.
    // e.g. http://localhost:4444/platform/link
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare link_entry_url: string | null;

    // ============================================================================================ Many to One

    // ============================================================================================ One to Many
    @HasMany(() => UserSystemAccess, 'system_id')                                                   declare access_users: UserSystemAccess[];
    @HasMany(() => SystemRole, 'system_id')                                                         declare roles: SystemRole[];
    
    // ============================================================================================ Many to Many

}

export default System;