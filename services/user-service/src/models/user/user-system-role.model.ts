import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import User       from './user.model';
import System     from '../system/system.model';
import SystemRole from '../system/system-role.model';
import { BaseModel } from '@models/baseModel';

@Table({
    tableName : 'user_system_roles',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class UserSystemRole extends BaseModel<UserSystemRole> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID, defaultValue: DataType.UUIDV4 })               declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => User)       @Column({ type: DataType.UUID,       allowNull: false })          declare user_id    : string;
    @ForeignKey(() => System)     @Column({ type: DataType.STRING(50), allowNull: false })          declare system_id  : string;
    @ForeignKey(() => SystemRole) @Column({ type: DataType.UUID,       allowNull: false })          declare role_id    : string;
    @ForeignKey(() => User)       @Column({ type: DataType.UUID,       allowNull: true  })          declare granted_by : string | null;

    // ============================================================================================ Fields
    @Column({ type: DataType.DATE, allowNull: true }) declare granted_at: Date | null;

    // ============================================================================================ Associations
    @BelongsTo(() => User,       { foreignKey: 'user_id',    as: 'user'    })                   declare user    : User;
    @BelongsTo(() => System,     { foreignKey: 'system_id',  as: 'system'  })                   declare system  : System;
    @BelongsTo(() => SystemRole, { foreignKey: 'role_id',    as: 'role'    })                   declare role    : SystemRole;
    @BelongsTo(() => User,       { foreignKey: 'granted_by', as: 'granter' })                   declare granter : User;
}

export default UserSystemRole;