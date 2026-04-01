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
    Patch,
    Post,
    Res,
} from '@nestjs/common';
import { UserService } from './service';
import { AdminUpdateUserDto, CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { Response } from 'express';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {

    constructor(private readonly usersService: UserService) {}

    // ── Admin endpoints ───────────────────────────────────────

    @Get()
    @Roles('admin')
    async findAll(
        @Res()                  res: Response
        , @Query("key")         key?: string
        , @Query("page")        page?: number
        , @Query("per_page")    per_page?: number
        , @Query("is_active")   is_active?: boolean
    ) {
        const parsedPage = page || 1;
        const parsedPerPage = per_page || 10;
        return this.usersService.findAll(
            res, 
            key,
            parsedPage,
            parsedPerPage,
            is_active,
        );
    }
    
    @Post()
    @Roles('admin')
    async create(
        @Res()  res: Response,
        @Body() body: CreateUserDto,
    ) {
        return this.usersService.create(res, body);
    }

    @Get(':id')
    @Roles('admin')
    async view(
        @Res()  res: Response,
        @Param('id') id: string
    ) {
        return this.usersService.view(res, id);
    }

    @Put(':id')
    @Roles('admin')
    async adminUpdate(
        @Res()  res: Response,
        @Param('id') id: string,
        @Body() body: AdminUpdateUserDto,
    ) {
        return this.usersService.update(res, id, body);
    }

    @Patch(':id/activate')
    @Roles('admin')
    async activate(
        @Res()  res: Response,
        @Param('id') id: string
    ) {
        return this.usersService.updateStatus(res, id, true);
    }

    @Patch(':id/deactivate')
    @Roles('admin')
    async deactivate(
        @Res()  res: Response,
        @Param('id') id: string
    ) {
        return this.usersService.updateStatus(res, id, false);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @Res()  res: Response,
        @Param('id') id: string
    ) {
        await this.usersService.remove(res, id);
    }
}