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

    @Column({ primaryKey: true, type: DataType.UUID, defaultValue: DataType.UUIDV4 })
    declare id: string;

    @ForeignKey(() => System)
    @Column({ type: DataType.STRING(50), allowNull: false })
    declare system_id: string;

    // Must match the Keycloak client role name exactly
    @Column({ type: DataType.STRING(100), allowNull: false })
    declare role_name: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    declare description: string | null;

    // If true, this role is auto-assigned when granting access to this system
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })
    declare is_default: boolean;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare creator_id: string | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare updater_id: string | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare deleter_id: string | null;

    @BelongsTo(() => System, { foreignKey: 'system_id',  as: 'system'  })
    declare system: System;

    @BelongsTo(() => User,   { foreignKey: 'creator_id', as: 'creator' })
    declare creator: User;

    @BelongsTo(() => User,   { foreignKey: 'updater_id', as: 'updater' })
    declare updater: User;

    @BelongsTo(() => User,   { foreignKey: 'deleter_id', as: 'deleter' })
    declare deleter: User;

    @CreatedAt declare created_at: Date;
    @UpdatedAt declare updated_at: Date;
    @DeletedAt declare deleted_at: Date | null;
}

export default SystemRole;