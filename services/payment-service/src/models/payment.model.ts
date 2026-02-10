import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, Index, HasMany } from 'sequelize-typescript';
import { Transaction } from './transaction.model';

export enum PaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

@Table({
    tableName: 'payments',
    timestamps: true,
    underscored: true,
})
export class Payment extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @Index
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'order_id',
    })
    orderId: string;

    @Index
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'user_id',
    })
    userId: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    amount: number;

    @Column({
        type: DataType.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
    })
    currency: string;

    @Column({
        type: DataType.ENUM(...Object.values(PaymentStatus)),
        allowNull: false,
        defaultValue: PaymentStatus.PENDING,
    })
    status: PaymentStatus;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'payment_method',
    })
    paymentMethod: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'payment_intent_id',
    })
    paymentIntentId: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    description: string;

    @HasMany(() => Transaction)
    transactions: Transaction[];

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;
}
