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
class App extends Model<App> {

    // ─── Primary key ──────────────────────────────────────────────────────────
    // String PK — 'system1' | 'system2' | 'hrm' | any future app id
    @Column({ primaryKey: true, type: DataType.STRING(50) })
    declare id: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    declare keycloak_client_id: string | null;

    // ─── Fields ───────────────────────────────────────────────────────────────
    @Column({ type: DataType.STRING(100), allowNull: false })
    declare name: string;

    @Column({ type: DataType.STRING(500), allowNull: true })
    declare logo: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare description: string | null;

    // Public app — users can self-register, access granted immediately
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })
    declare allow_self_register: boolean;

    // Managed app — users can request access, admin must approve
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })
    declare require_approval: boolean;

    // Internal app — no self-register, admin assigns only
    @Column({ type: DataType.BOOLEAN, defaultValue: false, allowNull: false })
    declare is_internal: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: true, allowNull: false })
    declare is_active: boolean;

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

    @BelongsTo(() => User, { foreignKey: 'creator_id', as: 'creator' })
    declare creator: User;

    @BelongsTo(() => User, { foreignKey: 'updater_id', as: 'updater' })
    declare updater: User;

    @BelongsTo(() => User, { foreignKey: 'deleter_id', as: 'deleter' })
    declare deleter: User;

    @CreatedAt declare created_at: Date;
    @UpdatedAt declare updated_at: Date;
    @DeletedAt declare deleted_at: Date | null;
}

export default App;