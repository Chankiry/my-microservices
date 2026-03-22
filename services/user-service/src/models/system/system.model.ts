import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import User from '../user/user.model';

@Table({
    tableName : 'systems',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class System extends Model<System> {

    // ============================================================================================ Primary Key
    @Column({ primaryKey: true, type: DataType.STRING(50) })                                        declare id: string;
    
    // ============================================================================================ Foreign Keys
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare creator_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare updater_id: string | null;
    @ForeignKey(() => User) @Column({ type: DataType.UUID, allowNull: true })                       declare deleter_id: string | null;

    // ============================================================================================ Field
    @Column({ type: DataType.STRING(100), allowNull: false })                                       declare name: string;
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare logo: string | null;
    @Column({ type: DataType.TEXT, allowNull: true })                                               declare description: string | null;
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare allow_self_register: boolean;
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare require_approval: boolean;
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })                      declare is_internal: boolean;
    @Column({ type: DataType.BOOLEAN, defaultValue: true, allowNull: false })                       declare is_active: boolean;

    // Keycloak client ID that handles auth for this system
    @Column({ type: DataType.STRING(100), allowNull: true })                                        declare keycloak_client_id: string | null;

    // Internal URL user-service calls to validate system-local credentials
    // e.g. http://plt:3005/internal/auth/validate
    // NULL means this system only supports platform (Keycloak) credentials
    @Column({ type: DataType.STRING(500), allowNull: true })                                        declare auth_callback_url: string | null;

    @CreatedAt                                                                                      declare created_at: Date;
    @UpdatedAt                                                                                      declare updated_at: Date;
    @DeletedAt                                                                                      declare deleted_at: Date | null;

    // ============================================================================================ Many to One
    
    @BelongsTo(() => User,   { foreignKey: 'creator_id', as: 'creator' })                           declare creator: User;
    @BelongsTo(() => User,   { foreignKey: 'updater_id', as: 'updater' })                           declare updater: User;
    @BelongsTo(() => User,   { foreignKey: 'deleter_id', as: 'deleter' })                           declare deleter: User;

}

export default System;