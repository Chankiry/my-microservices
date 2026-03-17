import {
    Table,
    Model,
    Column,
    DataType,
    Index,
    BeforeCreate,
    BeforeUpdate,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
} from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';

@Table({
    tableName: 'users',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
})
class User extends Model<User> {

    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @Index({ unique: true })
    @Column({ type: DataType.STRING(50) })
    declare username: string;

    @Index({ unique: true })
    @Column({ type: DataType.STRING(255) })
    declare email: string;

    @Column({ type: DataType.STRING(100), allowNull: true })
    declare firstName: string | null;

    @Column({ type: DataType.STRING(100), allowNull: true })
    declare lastName: string | null;

    @Column({ type: DataType.STRING(255), allowNull: true, field: 'password_hash' })
    declare passwordHash: string | null;

    @Index({ unique: true })
    @Column({ type: DataType.STRING, allowNull: true, field: 'keycloak_id' })
    declare keycloakId: string | null;

    @Column({ type: DataType.BOOLEAN, defaultValue: true, field: 'is_active' })
    declare isActive: boolean;

    @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'email_verified' })
    declare emailVerified: boolean;

    @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
    declare roles: string[] | null;

    @Column({ type: DataType.DATE, allowNull: true, field: 'last_login_at' })
    declare lastLoginAt: Date | null;

    @Column({ type: DataType.JSONB, allowNull: true })
    declare profile: {
        avatar? : string;
        phone?  : string;
        gender? : string;
    } | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @DeletedAt
    declare deletedAt: Date | null;

    // ─────────────────────────────────────────
    //  Hooks
    // ─────────────────────────────────────────

    @BeforeCreate
    @BeforeUpdate
    static async hashPassword(instance: User): Promise<void> {
        if (instance.passwordHash && !instance.passwordHash.startsWith('$2')) {
            instance.passwordHash = await bcrypt.hash(instance.passwordHash, 12);
        }
    }

    // ─────────────────────────────────────────
    //  Instance methods
    // ─────────────────────────────────────────

    async validatePassword(password: string): Promise<boolean> {
        if (!this.passwordHash) return false;
        return bcrypt.compare(password, this.passwordHash);
    }

    get fullName(): string {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }
}

export default User;