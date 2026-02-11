import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Payment from './payment.model';

export enum TransactionStatus {
    SUCCESS = 'success',
    FAILED = 'failed',
    PENDING = 'pending',
}

@Table({
    tableName: 'transactions',
    timestamps: true,
    underscored: true,
})
class Transaction extends Model<Transaction> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => Payment)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'payment_id',
    })
    paymentId: string;

    @BelongsTo(() => Payment)
    payment: Payment;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'transaction_id',
    })
    transactionId: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    type: string; // 'charge', 'refund', 'authorization'

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
        type: DataType.ENUM(...Object.values(TransactionStatus)),
        allowNull: false,
        defaultValue: TransactionStatus.PENDING,
    })
    status: TransactionStatus;

    @Column({
        type: DataType.JSONB,
        allowNull: true,
        field: 'gateway_response',
    })
    gatewayResponse: any;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    errorMessage: string;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;
}

export default Transaction;