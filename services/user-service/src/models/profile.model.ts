import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, Index } from 'sequelize-typescript';

@Table({
    tableName: 'profiles',
    timestamps: true,
    underscored: true,
})
export class Profile extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Index
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'user_id',
    })
    userId: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    avatar: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    bio: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    phone: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    address: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'date_of_birth',
    })
    dateOfBirth: Date;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    gender: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    country: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    city: string;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;
}
