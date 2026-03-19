import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, Request,
    HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ManagementService } from './service';
import { GrantAccessDto, UpdateAccessDto, RejectAccessDto, ExternalRoleChangeDto } from './dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform-admin')
export class ManagementController {

    constructor(private readonly managementService: ManagementService) {}

    // ─── Users overview ───────────────────────────────────────────────────────

    @Get('users')
    async findAllUsers(@Query() query: any) {
        return this.managementService.findAllUsers({
            page  : query.page,
            limit : query.limit,
            search: query.search,
        });
    }

    @Get('users/:user_id')
    async findUserDetail(@Param('user_id') user_id: string) {
        return this.managementService.findUserDetail(user_id);
    }

    @Get('users/:user_id/logins')
    async findLoginHistory(
        @Param('user_id')  user_id   : string,
        @Query('system_id') system_id?: string,
        @Query('limit')    limit?    : number,
    ) {
        return this.managementService.findLoginHistory(user_id, system_id, limit);
    }

    // ─── System-scoped views ──────────────────────────────────────────────────

    @Get('systems/:system_id/users')
    async findSystemUsers(
        @Param('system_id') system_id: string,
        @Query() query: any,
    ) {
        return this.managementService.findSystemUsers(system_id, {
            page  : query.page,
            limit : query.limit,
            status: query.status,
        });
    }

    @Get('systems/:system_id/pending')
    async findPendingApprovals(@Param('system_id') system_id: string) {
        return this.managementService.findPendingApprovals(system_id);
    }

    @Patch('systems/:system_id/external-roles')
    @Roles('system-connector')    // service account role — not platform-admin
    async updateExternalRoles(
        @Param('system_id') system_id: string,
        @Body() dto: ExternalRoleChangeDto,
        @Request() req: any,
    ) {
        return this.managementService.updateSystemRolesFromExternal(
            system_id,
            dto.external_id,
            dto.system_roles,
            req.user.sub,
        );
    }

    // ─── Grant / revoke ───────────────────────────────────────────────────────

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

    // ─── Approval workflow ────────────────────────────────────────────────────

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