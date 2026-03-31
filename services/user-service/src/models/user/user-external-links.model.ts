import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt,
} from 'sequelize-typescript';
import User   from './user.model';
import System from '../system/system.model';
import { BaseModel } from '@models/baseModel';

@Table({
    tableName : 'user_external_links',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
})
class UserExternalLinks extends BaseModel<UserExternalLinks> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID,defaultValue: DataType.UUIDV4})                 declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => System) @Column({ type: DataType.STRING(50), allowNull: false })              declare system_id: string;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: false })                      declare user_id: string;

    // ============================================================================================ Field
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare external_id: string;
    @Column({ type: DataType.STRING(30), allowNull: true })                                         declare external_type: string | null;


    // ============================================================================================ Many to One
    @BelongsTo(() => User,   { foreignKey: 'user_id',    as: 'user'    })                           declare user: User;
    @BelongsTo(() => System, { foreignKey: 'system_id',  as: 'system'  })                           declare system: System;

}

export default UserExternalLinks;