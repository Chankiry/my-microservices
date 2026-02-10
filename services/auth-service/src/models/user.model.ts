import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, BeforeCreate } from 'sequelize-typescript';
import * as bcrypt from 'bcrypt';

@Table({
    tableName: 'users',
    timestamps: true,
    underscored: true,
})
export class User extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    })
    email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    password: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    name: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'keycloak_id',
    })
    keycloakId: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'is_active',
    })
    isActive: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'email_verified_at',
    })
    emailVerifiedAt: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'last_login_at',
    })
    lastLoginAt: Date;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;

    // Hash password before creating user
    @BeforeCreate
    static async hashPassword(instance: User) {
        if (instance.password) {
            const salt = await bcrypt.genSalt(10);
            instance.password = await bcrypt.hash(instance.password, salt);
        }
    }

    // Compare password method
    async comparePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }

    // Exclude password from JSON
    toJSON() {
        const values = { ...this.get() };
        delete values.password;
        return values;
    }
}
