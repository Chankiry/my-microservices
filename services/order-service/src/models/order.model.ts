import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, HasMany } from 'sequelize-typescript';
import OrderItem from './order-item.model';

export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Table({
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    // Define indexes explicitly here to ensure the correct column name is used
    indexes: [
        {
            name: 'orders_user_id_idx', // Optional: explicit index name
            fields: ['user_id'], // Use the actual database column name (snake_case)
        },
    ],
})
class Order extends Model<Order> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    // REMOVED @Index from here
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'user_id',
    })
    userId: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'order_number',
    })
    orderNumber: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_amount',
    })
    totalAmount: number;

    @Column({
        type: DataType.ENUM(...Object.values(OrderStatus)),
        allowNull: false,
        defaultValue: OrderStatus.PENDING,
    })
    status: OrderStatus;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    notes: string;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'completed_at',
    })
    completedAt: Date;

    @HasMany(() => OrderItem)
    items: OrderItem[];

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;

    static generateOrderNumber(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `ORD-${timestamp}-${random}`;
    }
}

export default Order;