// ================================================================>> Core Library
import { SequelizeModuleOptions } from '@nestjs/sequelize';

// ================================================================>> Third Party Library
import * as dotenv from 'dotenv';
import { Dialect } from 'sequelize';

dotenv.config();

/** @PostgreSQL and @MySQL */
const sequelizeConfig: SequelizeModuleOptions = {
    dialect: (process.env.DB_CONNECTION as Dialect) || 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: process.env.DB_TIMEZONE || 'Asia/Phnom_Penh',
    models: [__dirname + '/../models/**/*.model.{ts,js}'],
    logging: false,
    autoLoadModels: true,
    synchronize: process.env.NODE_ENV === 'development',
};

export default sequelizeConfig;
