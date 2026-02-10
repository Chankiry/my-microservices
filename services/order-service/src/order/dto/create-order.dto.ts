import { IsString, IsUUID, IsArray, IsOptional, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
    @ApiProperty({
        description: 'Product name',
        example: 'Wireless Headphones',
    })
    @IsString()
    productName: string;

    @ApiPropertyOptional({
        description: 'Product SKU',
        example: 'WH-001',
    })
    @IsString()
    @IsOptional()
    productSku?: string;

    @ApiProperty({
        description: 'Quantity',
        example: 2,
        minimum: 1,
    })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    quantity: number;

    @ApiProperty({
        description: 'Unit price',
        example: 99.99,
    })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    price: number;
}

export class CreateOrderDto {
    @ApiProperty({
        description: 'User ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'Order items',
        type: [OrderItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiPropertyOptional({
        description: 'Order notes',
        example: 'Please deliver after 5 PM',
    })
    @IsString()
    @IsOptional()
    notes?: string;
}
