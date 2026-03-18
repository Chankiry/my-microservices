import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt, UpdatedAt,
} from 'sequelize-typescript';
import User from './user.model';
import App  from '../system/system.model';

// No paranoid — if a link is deleted it should be hard-deleted.
// Soft-deleting an external link creates ambiguity about whether
// the user is still linked to that external system.
@Table({
    tableName : 'user_external_links',
    createdAt : 'created_at',
    updatedAt : 'updated_at',
})
class UserExternalLinks extends Model<UserExternalLinks> {

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

    // ─── Link fields ──────────────────────────────────────────────────────────
    // The ID this user has in the external system's own database
    @Column({ type: DataType.STRING(100), allowNull: false })
    declare external_id: string;

    // Describes the type of the external_id value for clarity
    // e.g. 'integer_id' | 'uuid' | 'employee_code'
    @Column({ type: DataType.STRING(30), allowNull: true })
    declare external_type: string | null;

    // ─── Audit ────────────────────────────────────────────────────────────────
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare creator_id: string | null;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: true })
    declare updater_id: string | null;

    // No deleter_id — hard deletes don't have a deleter concept

    // ─── Associations ─────────────────────────────────────────────────────────
    @BelongsTo(() => User, { foreignKey: 'user_id',    as: 'user' })
    declare user: User;

    @BelongsTo(() => App,  { foreignKey: 'app_id',     as: 'app' })
    declare app: App;

    @BelongsTo(() => User, { foreignKey: 'creator_id', as: 'creator' })
    declare creator: User;

    @BelongsTo(() => User, { foreignKey: 'updater_id', as: 'updater' })
    declare updater: User;

    @CreatedAt declare created_at: Date;
    @UpdatedAt declare updated_at: Date;
}

export default UserExternalLinks;