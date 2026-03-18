import {
    Table, Model, Column, DataType,
    ForeignKey, BelongsTo,
    CreatedAt,
} from 'sequelize-typescript';
import User from './user.model';
import App  from '../system/system.model';

// No paranoid, no updatedAt — login logs are append-only.
// They are never edited or soft-deleted.
@Table({
    tableName : 'user_login_logs',
    createdAt : 'created_at',
    updatedAt : false,
})
class UserLoginLog extends Model<UserLoginLog> {

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

    // ─── Log fields ───────────────────────────────────────────────────────────
    @Column({ type: DataType.STRING(45), allowNull: true })
    declare ip: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare user_agent: string | null;

    // ─── No audit columns ─────────────────────────────────────────────────────
    // Login logs are system-generated, not user-initiated.
    // creator/updater/deleter don't apply here.

    // ─── Associations ─────────────────────────────────────────────────────────
    @BelongsTo(() => User, { foreignKey: 'user_id', as: 'user' })
    declare user: User;

    @BelongsTo(() => App,  { foreignKey: 'app_id',  as: 'app' })
    declare app: App;

    @CreatedAt declare created_at: Date;
}

export default UserLoginLog;