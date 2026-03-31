import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Request, HttpCode, HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { SystemService }     from './service';
import { CreateSystemDto, UpdateSystemDto, CreateSystemRoleDto, UpdateSystemRoleDto } from './dto';
import { JwtAuthGuard }      from '../../core/guards/jwt-auth.guard';
import { RolesGuard }        from '../../core/guards/roles.guard';
import { Roles }             from '../../core/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
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
    async update(@Param('id') id: string, @Body() dto: UpdateSystemDto, @Request() req: any) {
        return this.systemService.update(id, dto, req.user.sub);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string, @Request() req: any) {
        await this.systemService.remove(id, req.user.sub);
    }

    // ─── System Roles ─────────────────────────────────────────────────────────

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

    @Patch(':id/roles/:slug')
    async updateRole(
        @Param('id')   id  : string,
        @Param('slug') slug: string,
        @Body() dto: UpdateSystemRoleDto,
        @Request() req: any,
    ) {
        return this.systemService.updateRole(id, slug, dto, req.user.sub);
    }

    @Delete(':id/roles/:slug')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeRole(
        @Param('id')   id  : string,
        @Param('slug') slug: string,
        @Request() req: any,
    ) {
        await this.systemService.removeRole(id, slug, req.user.sub);
    }
}