import {
    Table,
    Model,
    Column,
    DataType,
    CreatedAt,
    UpdatedAt,
    Index,
} from 'sequelize-typescript';

@Table({
    tableName: 'outbox_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
})
class OutboxMessage extends Model<OutboxMessage> {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @Column({ type: DataType.STRING })
    declare eventType: string;

    @Column({ type: DataType.STRING })
    declare aggregateType: string;

    @Column({ type: DataType.STRING })
    declare aggregateId: string;

    @Column({ type: DataType.JSONB }) // or TEXT if not using PostgreSQL
    declare payload: any;

    @Column({
        type: DataType.ENUM('PENDING', 'PROCESSED', 'FAILED'),
        defaultValue: 'PENDING',
    })
    declare status: string;

    @Column({ type: DataType.INTEGER, defaultValue: 0 })
    declare retryCount: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare lastError: string | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare processedAt: Date | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}

export default OutboxMessage;