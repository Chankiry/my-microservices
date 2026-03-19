import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Request, HttpCode, HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { SystemService } from './service';
import { CreateSystemDto, UpdateSystemDto, CreateSystemRoleDto } from './dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform-admin')
export class SystemController {

    constructor(private readonly systemService: SystemService) {}

    // ─── System CRUD ──────────────────────────────────────────────────────────

    @Get()
    async findAll() {
        return this.systemService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.systemService.findById(id);
    }

    @Post()
    async create(@Body() dto: CreateSystemDto, @Request() req: any) {
        return this.systemService.create(dto, req.user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateSystemDto,
        @Request() req: any,
    ) {
        return this.systemService.update(id, dto, req.user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.systemService.remove(id, req.user.sub);
    }

    // ─── System roles ─────────────────────────────────────────────────────────

    @Get(':id/roles')
    async findRoles(@Param('id') id: string) {
        return this.systemService.findRoles(id);
    }

    @Post(':id/roles')
    async createRole(
        @Param('id') id: string,
        @Body() dto: CreateSystemRoleDto,
        @Request() req: any,
    ) {
        return this.systemService.createRole(id, dto, req.user.sub);
    }

    @Delete(':id/roles/:role_name')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeRole(
        @Param('id')        id       : string,
        @Param('role_name') role_name: string,
        @Request() req: any,
    ) {
        await this.systemService.removeRole(id, role_name, req.user.sub);
    }
}