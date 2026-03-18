import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt, DeletedAt,
} from 'sequelize-typescript';
import User from './user.model';
import App  from '../system/system.model';

@Table({
    tableName : 'user_app_access',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
    deletedAt : 'deleted_at',
    paranoid  : true,
})
class UserAppAccess extends Model<UserAppAccess> {

    // ─── Primary key ──────────────────────────────────────────────────────────
    @Column({ primaryKey: true, type: DataType.UUID, defaultValue: DataType.UUIDV4 })
    declare id: string;

    // ─── Foreign keys ─────────────────────────────────────────────────────────
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare user_id: string;

    @ForeignKey(() => App)
    @Column({ type: DataType.STRING(50), allowNull: false })
    declare app_id: string;

    // ─── Access fields ────────────────────────────────────────────────────────
    // How this user got access to this app
    @Column({
        type      : DataType.ENUM('public', 'managed', 'internal'),
        allowNull : false,
    })
    declare account_type: 'public' | 'managed' | 'internal';

    // Current status of this user's access to this app
    @Column({
        type         : DataType.ENUM('pending', 'active', 'suspended', 'rejected'),
        defaultValue : 'pending',
        allowNull    : false,
    })
    declare registration_status: 'pending' | 'active' | 'suspended' | 'rejected';

    // Roles this user has within this specific app
    // Mirrors what is assigned in Keycloak client roles
    @Column({ type: DataType.ARRAY(DataType.STRING), defaultValue: [], allowNull: false })
    declare app_roles: string[];

    // ─── Approval tracking ────────────────────────────────────────────────────
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare granted_by: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare granted_at: Date | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare rejected_by: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare rejected_at: Date | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare rejected_reason: string | null;

    // Last time this user logged into THIS specific app
    // Global last login lives on users.last_login_at
    @Column({ type: DataType.DATE, allowNull: true })
    declare last_login_at: Date | null;

    // ─── Audit ────────────────────────────────────────────────────────────────
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare creator_id: string | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare updater_id: string | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare deleter_id: string | null;

    // ─── Associations ─────────────────────────────────────────────────────────
    @BelongsTo(() => User, { foreignKey: 'user_id',     as: 'user' })
    declare user: User;

    @BelongsTo(() => App,  { foreignKey: 'app_id',      as: 'app' })
    declare app: App;

    @BelongsTo(() => User, { foreignKey: 'granted_by',  as: 'granter' })
    declare granter: User;

    @BelongsTo(() => User, { foreignKey: 'rejected_by', as: 'rejecter' })
    declare rejecter: User;

    @BelongsTo(() => User, { foreignKey: 'creator_id',  as: 'creator' })
    declare creator: User;

    @BelongsTo(() => User, { foreignKey: 'updater_id',  as: 'updater' })
    declare updater: User;

    @BelongsTo(() => User, { foreignKey: 'deleter_id',  as: 'deleter' })
    declare deleter: User;

    @CreatedAt declare created_at: Date;
    @UpdatedAt declare updated_at: Date;
    @DeletedAt declare deleted_at: Date | null;
}

export default UserAppAccess;