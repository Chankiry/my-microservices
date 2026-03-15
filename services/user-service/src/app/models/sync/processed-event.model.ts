import {
    Table,
    Model,
    Column,
    DataType,
    Index,
    CreatedAt,
} from 'sequelize-typescript';

@Table({
    tableName: 'processed_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // no updatedAt needed
})
class ProcessedEvent extends Model<ProcessedEvent> {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @Index({ unique: true })
    @Column({ type: DataType.STRING(255) })
    declare eventId: string;

    @Column({ type: DataType.STRING(100) })
    declare eventType: string;

    @CreatedAt
    declare createdAt: Date;
}

export default ProcessedEvent;