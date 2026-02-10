import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, Index } from 'sequelize-typescript';

export enum NotificationType {
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
}

@Table({
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
})
export class Notification extends Model {
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
        type: DataType.ENUM(...Object.values(NotificationType)),
        allowNull: false,
    })
    type: NotificationType;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    title: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    message: string;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
    })
    data: any;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_read',
    })
    isRead: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'read_at',
    })
    readAt: Date;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    link: string;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;
}
