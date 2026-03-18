import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    ForbiddenException,
    Patch,
    Post,
} from '@nestjs/common';
import { UserService } from './service';
import { AdminUpdateUserDto, CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {

    constructor(private readonly usersService: UserService) {}

    // ── Admin endpoints ───────────────────────────────────────

    @Get()
    @Roles('admin')
    async findAll(@Query() query: any) {
        return this.usersService.findAll({
            page     : query.page,
            limit    : query.limit,
            search   : query.search,
            is_active: query.is_active,
        });
    }
    
    @Post()
    @Roles('admin')
    async create(
        @Body() dto: CreateUserDto,
    ) {
        return this.usersService.create(dto);
    }

    @Get(':id')
    @Roles('admin')
    async findOne(@Param('id') id: string) {
        return this.usersService.findById(id);
    }

    @Put(':id')
    @Roles('admin')
    async adminUpdate(
        @Param('id') id: string,
        @Body() dto: AdminUpdateUserDto,
    ) {
        return this.usersService.update(id, dto);
    }

    @Patch(':id/activate')
    @Roles('admin')
    async activate(@Param('id') id: string) {
        return this.usersService.updateStatus(id, true);
    }

    @Patch(':id/deactivate')
    @Roles('admin')
    async deactivate(@Param('id') id: string) {
        return this.usersService.updateStatus(id, false);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
        await this.usersService.remove(id);
    }
}