import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all orders' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    async findAll(
        @Query('userId') userId?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        console.log("hello");
        return this.orderService.findAll({ userId, page: +page, limit: +limit });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(@Param('id') id: string) {
        return this.orderService.findOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(@Body() createOrderDto: CreateOrderDto) {
        return this.orderService.create(createOrderDto);
    }

    @Put(':id/status')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update order status' })
    @ApiResponse({ status: 200, description: 'Order status updated successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async updateStatus(
        @Param('id') id: string,
        @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    ) {
        return this.orderService.updateStatus(id, updateOrderStatusDto);
    }

    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel order' })
    @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async cancel(@Param('id') id: string) {
        return this.orderService.cancel(id);
    }
}
