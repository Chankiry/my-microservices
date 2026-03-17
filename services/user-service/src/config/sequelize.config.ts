// ===========================================================================>> Core Library
import { SequelizeModuleOptions } from '@nestjs/sequelize';

// ===========================================================================>> Third Party Library
import { Dialect } from 'sequelize';
import { appConfig } from './app.config';

/** @MySQL and @Postgresql */
const sequelizeConfig: SequelizeModuleOptions = {
    dialect     : appConfig.DB_CONNECTION as Dialect || 'postgres',
    host        : appConfig.DB_HOST,
    port        : Number(appConfig.DB_PORT),
    username    : appConfig.DB_USERNAME,
    password    : appConfig.DB_PASSWORD,
    database    : appConfig.DB_DATABASE,
    timezone    : appConfig.DB_TIMEZONE || 'UTC',
    models      : [__dirname + '/../models/**/*.model.{ts,js}'],
    logging     : false
};

export default sequelizeConfig;
