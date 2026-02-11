import e from 'express';
import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, Index } from 'sequelize-typescript';

@Table({
    tableName: 'preferences',
    timestamps: true,
    underscored: true,
})
class Preference extends Model<Preference> {
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
        allowNull: false,
        defaultValue: 'en',
    })
    language: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: 'light',
    })
    theme: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'email_notifications',
    })
    emailNotifications: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'push_notifications',
    })
    pushNotifications: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'sms_notifications',
    })
    smsNotifications: boolean;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'timezone',
    })
    timezone: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'currency',
    })
    currency: string;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;
}

export default Preference;