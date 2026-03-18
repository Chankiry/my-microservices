import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, Request,
    HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ManagementService } from './service';
import { GrantAccessDto, UpdateAccessDto, RejectAccessDto } from './dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
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

    // Login history for a user — optional filter by app
    @Get('users/:user_id/logins')
    async findLoginHistory(
        @Param('user_id') user_id: string,
        @Query('app_id') app_id?: string,
        @Query('limit')  limit ?: number,
    ) {
        return this.managementService.findLoginHistory(user_id, app_id, limit);
    }

    // ─── App-scoped views ─────────────────────────────────────────────────────

    @Get('apps/:app_id/users')
    async findAppUsers(
        @Param('app_id') app_id: string,
        @Query() query: any,
    ) {
        return this.managementService.findAppUsers(app_id, {
            page  : query.page,
            limit : query.limit,
            status: query.status,
        });
    }

    @Get('apps/:app_id/pending')
    async findPendingApprovals(@Param('app_id') app_id: string) {
        return this.managementService.findPendingApprovals(app_id);
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

    @Patch('users/:user_id/access/:app_id')
    async updateAccess(
        @Param('user_id') user_id: string,
        @Param('app_id')  app_id : string,
        @Body() dto: UpdateAccessDto,
        @Request() req: any,
    ) {
        return this.managementService.updateAccess(user_id, app_id, dto, req.user.sub);
    }

    @Delete('users/:user_id/access/:app_id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeAccess(
        @Param('user_id') user_id: string,
        @Param('app_id')  app_id : string,
        @Request() req: any,
    ) {
        await this.managementService.revokeAccess(user_id, app_id, req.user.sub);
    }

    // ─── Approval workflow ────────────────────────────────────────────────────

    @Post('users/:user_id/access/:app_id/approve')
    async approveAccess(
        @Param('user_id') user_id: string,
        @Param('app_id')  app_id : string,
        @Request() req: any,
    ) {
        return this.managementService.approveAccess(user_id, app_id, req.user.sub);
    }

    @Post('users/:user_id/access/:app_id/reject')
    async rejectAccess(
        @Param('user_id') user_id: string,
        @Param('app_id')  app_id : string,
        @Body() dto: RejectAccessDto,
        @Request() req: any,
    ) {
        return this.managementService.rejectAccess(user_id, app_id, req.user.sub, dto);
    }
}