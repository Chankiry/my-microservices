// ================================================================>> Core Library
import { SequelizeModuleOptions } from '@nestjs/sequelize';

// ================================================================>> Third Party Library
import * as dotenv from 'dotenv';
import { Dialect } from 'sequelize';

dotenv.config();

/** @MySQL and @Postgresql */
const sequelizeConfig: SequelizeModuleOptions = {
    dialect: process.env.DB_CONNECTION as Dialect || 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_DATABASE || 'order_db',
    timezone: process.env.DB_TIMEZONE || 'Asia/Phnom_Penh',
    models: [__dirname + '/../models/**/*.model.{ts,js}'],
    logging: false
};

export default sequelizeConfig;
