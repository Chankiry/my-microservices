// src/modules/users/users.controller.ts
import {
    Controller,
    Get,
    Post,
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
} from '@nestjs/common';
import { UsersService } from './service';
import { JwtAuthGuard } from 'src/app/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/app/core/guards/roles.guard';
import { Public } from 'src/app/core/decorators/public.decorator';
import { Roles } from 'src/app/core/decorators/roles.decorator';
import { CreateUserDto, UpdateUserDto } from './dto';


@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @Public()
    async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
        return { id: user.id, username: user.username, email: user.email };
    }

    // @Get()
    // @Roles('admin')
    // async findAll(@Query() query: any) {
    //     return this.usersService.findAll(query);
    // }

    @Get('me')
    async getCurrentUser(@Request() req) {
        return this.usersService.findById(req.user.sub);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
    // Allow users to view their own profile, admins can view any
        if (req.user.sub !== id && !req.user.roles?.includes('admin')) {
            throw new ForbiddenException('Access denied');
        }
        return this.usersService.findById(id);
    }

    @Put(':id')
    async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
    ) {
        if (req.user.sub !== id && !req.user.roles?.includes('admin')) {
            throw new ForbiddenException('Cannot update other users');
        }
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id') id: string) {
        await this.usersService.remove(id);
    }

    // @Post(':id/activate')
    // @Roles('admin')
    // async activate(@Param('id') id: string) {
    //     return this.usersService.updateStatus(id, true);
    // }

    // @Post(':id/deactivate')
    // @Roles('admin')
    // async deactivate(@Param('id') id: string) {
    //     return this.usersService.updateStatus(id, false);
    // }
}