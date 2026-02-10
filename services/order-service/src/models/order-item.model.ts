import { Table, Column, Model, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Order } from './order.model';

@Table({
    tableName: 'order_items',
    timestamps: true,
    underscored: true,
})
export class OrderItem extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @ForeignKey(() => Order)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'order_id',
    })
    orderId: string;

    @BelongsTo(() => Order)
    order: Order;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'product_name',
    })
    productName: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'product_sku',
    })
    productSku: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1,
    })
    quantity: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    price: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    subtotal: number;

    @CreatedAt
    @Column({ field: 'created_at' })
    createdAt: Date;

    @UpdatedAt
    @Column({ field: 'updated_at' })
    updatedAt: Date;

    // Calculate subtotal before creating
    static calculateSubtotal(quantity: number, price: number): number {
        return parseFloat((quantity * price).toFixed(2));
    }
}
