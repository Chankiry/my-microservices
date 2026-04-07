import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import User   from './user.model';
import System from '../system/system.model';
import { BaseModel } from '@models/baseModel';
import { UserSystemAccessAccountTypeEnum, UserSystemAccessRegistrationStatusEnum } from '@app/shared/enums/System.enum';

@Table({
    tableName : 'user_system_access',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class UserSystemAccess extends BaseModel<UserSystemAccess> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID,defaultValue: DataType.UUIDV4})                 declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => System) @Column({ type: DataType.STRING(50), allowNull: false })              declare system_id: string;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: false })                      declare user_id: string;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare granted_by: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare rejected_by: string | null;
    
    // ============================================================================================ Field
    @Column({ 
        type: DataType.ENUM(...Object.values(UserSystemAccessAccountTypeEnum)), 
        allowNull : false
    })                                                                                              declare account_type: UserSystemAccessAccountTypeEnum;
    @Column({ 
        type: DataType.ENUM(...Object.values(UserSystemAccessRegistrationStatusEnum)), 
        defaultValue : 'pending', 
        allowNull    : false
    })                                                                                              declare registration_status: UserSystemAccessRegistrationStatusEnum;

    @Column({ type: DataType.DATE, allowNull: true })                                               declare granted_at: Date | null;
    @Column({ type: DataType.DATE, allowNull: true })                                               declare rejected_at: Date | null;
    @Column({ type: DataType.TEXT, allowNull: true })                                               declare rejected_reason: string | null;
    @Column({ type: DataType.DATE, allowNull: true })                                               declare last_login_at: Date | null;

    // ============================================================================================ Many to One
    @BelongsTo(() => User,   { foreignKey: 'user_id',     as: 'user'     })                         declare user: User;
    @BelongsTo(() => System, { foreignKey: 'system_id',   as: 'system'   })                         declare system: System;
    @BelongsTo(() => User,   { foreignKey: 'granted_by',  as: 'granter'  })                         declare granter: User;
    @BelongsTo(() => User,   { foreignKey: 'rejected_by', as: 'rejecter' })                         declare rejecter: User;
}

export default UserSystemAccess;