import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Request, Query, HttpCode, HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ManagementService }   from './service';
import { JwtAuthGuard }        from '../../core/guards/jwt-auth.guard';
import { RolesGuard }          from '../../core/guards/roles.guard';
import { Roles }               from '../../core/decorators/roles.decorator';
import {
    GrantAccessDto, UpdateAccessDto, RejectAccessDto,
    ExternalRoleChangeDto, AssignUserRoleDto, CreatePlatformUserDto,
} from './dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ManagementController {

    constructor(private readonly managementService: ManagementService) {}

    // ─── Users ────────────────────────────────────────────────────────────────

    @Get('users')
    async findAllUsers(@Query() query: any) {
        return this.managementService.findAllUsers({
            page  : query.page,
            limit : query.limit,
            search: query.search,
        });
    }

    @Post('users')
    async createPlatformUser(@Body() dto: CreatePlatformUserDto, @Request() req: any) {
        return this.managementService.createPlatformUser(dto, req.user.sub);
    }

    @Get('users/:user_id')
    async findUser(@Param('user_id') user_id: string) {
        return this.managementService.findUserById(user_id);
    }

    // ─── User Role Management ─────────────────────────────────────────────────

    @Get('users/:user_id/roles')
    async getUserRoles(
        @Param('user_id') user_id  : string,
        @Query('system_id') system_id?: string,
    ) {
        return this.managementService.getUserRoles(user_id, system_id);
    }

    @Post('users/:user_id/roles')
    async assignRole(
        @Param('user_id') user_id: string,
        @Body() dto: AssignUserRoleDto,
        @Request() req: any,
    ) {
        return this.managementService.assignRoleToUser(user_id, dto, req.user.sub);
    }

    @Delete('users/:user_id/roles/:role_id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeRole(
        @Param('user_id') user_id: string,
        @Param('role_id') role_id: string,
        @Request() req: any,
    ) {
        await this.managementService.revokeRoleFromUser(user_id, role_id, req.user.sub);
    }

    // ─── Login History ────────────────────────────────────────────────────────

    @Get('users/:user_id/login-history')
    async getLoginHistory(
        @Param('user_id')   user_id   : string,
        @Query('system_id') system_id?: string,
        @Query('limit')     limit?    : number,
    ) {
        return this.managementService.findLoginHistory(user_id, system_id, limit);
    }

    // ─── System-scoped views ──────────────────────────────────────────────────

    @Get('systems/:system_id/users')
    async findSystemUsers(@Param('system_id') system_id: string, @Query() query: any) {
        return this.managementService.findSystemUsers(system_id, {
            page: query.page, limit: query.limit, status: query.status,
        });
    }

    @Get('systems/:system_id/pending')
    async findPendingApprovals(@Param('system_id') system_id: string) {
        return this.managementService.findPendingApprovals(system_id);
    }

    // External system notifies user-service that a user's roles changed
    @Patch('systems/:system_id/external-roles')
    @Roles('system-connector')
    async updateExternalRoles(
        @Param('system_id') system_id: string,
        @Body() dto: ExternalRoleChangeDto,
        @Request() req: any,
    ) {
        return this.managementService.updateSystemRolesFromExternal(
            system_id, dto.external_id, dto.role_slugs, req.user.sub,
        );
    }

    // ─── Access CRUD ──────────────────────────────────────────────────────────

    @Post('users/:user_id/access')
    async grantAccess(
        @Param('user_id') user_id: string,
        @Body() dto: GrantAccessDto,
        @Request() req: any,
    ) {
        return this.managementService.grantAccess(user_id, dto, req.user.sub);
    }

    @Patch('users/:user_id/access/:system_id')
    async updateAccess(
        @Param('user_id')   user_id  : string,
        @Param('system_id') system_id: string,
        @Body() dto: UpdateAccessDto,
        @Request() req: any,
    ) {
        return this.managementService.updateAccess(user_id, system_id, dto, req.user.sub);
    }

    @Delete('users/:user_id/access/:system_id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeAccess(
        @Param('user_id')   user_id  : string,
        @Param('system_id') system_id: string,
        @Request() req: any,
    ) {
        await this.managementService.revokeAccess(user_id, system_id, req.user.sub);
    }

    @Post('users/:user_id/access/:system_id/approve')
    async approveAccess(
        @Param('user_id')   user_id  : string,
        @Param('system_id') system_id: string,
        @Request() req: any,
    ) {
        return this.managementService.approveAccess(user_id, system_id, req.user.sub);
    }

    @Post('users/:user_id/access/:system_id/reject')
    async rejectAccess(
        @Param('user_id')   user_id  : string,
        @Param('system_id') system_id: string,
        @Body() dto: RejectAccessDto,
        @Request() req: any,
    ) {
        return this.managementService.rejectAccess(user_id, system_id, req.user.sub, dto);
    }
}