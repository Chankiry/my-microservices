import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import App from '../../../models/system/system.model';
import { CreateAppDto, UpdateAppDto } from './dto';

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(
        @InjectModel(App)
        private readonly appModel: typeof App,
    ) {}

    async findAll(): Promise<App[]> {
        return this.appModel.findAll({
            order: [['created_at', 'ASC']],
        });
    }

    async findById(id: string): Promise<App> {
        const app = await this.appModel.findOne({ where: { id } });
        if (!app) throw new NotFoundException(`App '${id}' not found`);
        return app;
    }

    async create(dto: CreateAppDto, creator_id: string): Promise<App> {
        const existing = await this.appModel.findOne({ where: { id: dto.id } });
        if (existing) throw new ConflictException(`App '${dto.id}' already exists`);

        const app = await this.appModel.create({
            ...dto,
            creator_id,
            allow_self_register : dto.allow_self_register ?? false,
            require_approval    : dto.require_approval    ?? false,
            is_internal         : dto.is_internal         ?? false,
            is_active           : true,
        } as any);

        this.logger.log(`App created: ${app.id}`);
        return app;
    }

    async update(id: string, dto: UpdateAppDto, updater_id: string): Promise<App> {
        const app = await this.findById(id);

        Object.assign(app, dto);
        app.updater_id = updater_id;
        await app.save();

        this.logger.log(`App updated: ${id}`);
        return app;
    }

    async remove(id: string, deleter_id: string): Promise<void> {
        const app = await this.findById(id);
        app.deleter_id = deleter_id;
        await app.save();
        await app.destroy();
        this.logger.log(`App soft-deleted: ${id}`);
    }
}