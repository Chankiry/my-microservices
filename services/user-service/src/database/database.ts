import { Sequelize } from "sequelize";
import sequelizeConfig from "../config/sequelize.config";

export const db = new Sequelize(sequelizeConfig);