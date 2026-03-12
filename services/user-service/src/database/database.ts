import sequelizeConfig from "src/config/sequelize.config";
import { Sequelize } from "sequelize";

export const db = new Sequelize(sequelizeConfig);