import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import System from './system.model';
import User   from '../user/user.model';

@Table({
    tableName : 'system_roles',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class SystemRole extends Model<SystemRole> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID,defaultValue: DataType.UUIDV4})                 declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => System) @Column({ type: DataType.STRING(50), allowNull: false })              declare system_id: string;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare creator_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare updater_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare deleter_id: string | null;

    // ============================================================================================ Field
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare name_kh     : string;
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare name_en     : string;
 
    // Unique identifier per system — used internally (e.g. 'admin', 'user', 'officer')
    @Column({ type: DataType.STRING(50),  allowNull: false })                                       declare slug        : string;
 
    @Column({ type: DataType.STRING(100), allowNull: true  })                                       declare icon        : string | null;
    @Column({ type: DataType.STRING(20),  allowNull: true  })                                       declare color       : string | null;
    @Column({ type: DataType.TEXT,        allowNull: true  })                                       declare description : string | null;
 
    // ═══════════════════════════════════════════════════ Status
    @Column({ type: DataType.BOOLEAN, defaultValue: true,  allowNull: false })                      declare is_active   : boolean;
 
    // Auto-assigned when granting a user access to this system
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare is_default  : boolean;

    // realm  → Keycloak realm role  (only for platform system)
    // client → Keycloak client role (for external Keycloak systems)
    @Column({
        type        : DataType.ENUM('realm', 'client'),
        allowNull   : false,
        defaultValue: 'client',
    })
    declare role_type: 'realm' | 'client';
 
    // Exact role name in Keycloak. For realm type: 'admin' | 'user'.
    // For client type: whatever name was created in that client.
    @Column({ type: DataType.STRING(100), allowNull: true })                                        declare keycloak_role_name: string | null;

    @CreatedAt                                                                                      declare created_at: Date;
    @UpdatedAt                                                                                      declare updated_at: Date;
    @DeletedAt                                                                                      declare deleted_at: Date | null;

    // ============================================================================================ Many to One
    @BelongsTo(() => System, { foreignKey: 'system_id',  as: 'system'  })                           declare system: System;

    @BelongsTo(() => User,   { foreignKey: 'creator_id', as: 'creator' })                           declare creator: User;
    @BelongsTo(() => User,   { foreignKey: 'updater_id', as: 'updater' })                           declare updater: User;
    @BelongsTo(() => User,   { foreignKey: 'deleter_id', as: 'deleter' })                           declare deleter: User;

}

export default SystemRole;