import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt,
} from 'sequelize-typescript';
import User   from './user.model';
import System from '../system/system.model';

@Table({
    tableName : 'user_external_links',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
})
class UserExternalLinks extends Model<UserExternalLinks> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.UUID,defaultValue: DataType.UUIDV4})                 declare id: string;

    // ============================================================================================ Foreign Keys
    @ForeignKey(() => System) @Column({ type: DataType.STRING(50), allowNull: false })              declare system_id: string;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: false })                      declare user_id: string;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare creator_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare updater_id: string | null;

    // ============================================================================================ Field
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare external_id: string;
    @Column({ type: DataType.STRING(30), allowNull: true })                                         declare external_type: string | null;

    @CreatedAt                                                                                      declare created_at: Date;
    @UpdatedAt                                                                                      declare updated_at: Date;

    // ============================================================================================ Many to One
    @BelongsTo(() => User,   { foreignKey: 'user_id',    as: 'user'    })                           declare user: User;
    @BelongsTo(() => System, { foreignKey: 'system_id',  as: 'system'  })                           declare system: System;

    @BelongsTo(() => User,   { foreignKey: 'creator_id', as: 'creator' })                           declare creator: User;
    @BelongsTo(() => User,   { foreignKey: 'updater_id', as: 'updater' })                           declare updater: User;

}

export default UserExternalLinks;