import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Request, HttpCode, HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { AppService } from './service';
import { CreateAppDto, UpdateAppDto } from './dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AppController {

    constructor(private readonly appService: AppService) {}

    @Get()
    async findAll() {
        return this.appService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.appService.findById(id);
    }

    @Post()
    async create(@Body() dto: CreateAppDto, @Request() req: any) {
        return this.appService.create(dto, req.user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateAppDto,
        @Request() req: any,
    ) {
        return this.appService.update(id, dto, req.user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.appService.remove(id, req.user.sub);
    }
}