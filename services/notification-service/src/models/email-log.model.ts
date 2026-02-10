import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt } from 'sequelize-typescript';

export enum EmailStatus {
    SENT = 'sent',
    FAILED = 'failed',
    PENDING = 'pending',
}

@Table({
    tableName: 'email_logs',
    timestamps: true,
    underscored: true,
})
export class EmailLog extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    to: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    from: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    subject: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    body: string;

    @Column({
        type: DataType.ENUM(...Object.values(EmailStatus)),
        allowNull: false,
        defaultValue: EmailStatus.PENDING,
    })
    status: EmailStatus;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    error: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'sent_at',
    })
    sentAt: Date;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;
}
