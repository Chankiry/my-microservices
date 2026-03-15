// ================================================================>> Third Party Library
import "colors";
import * as readlineSync from 'readline-sync';
import { Sequelize } from 'sequelize-typescript';

// ================================================================>> Custom Library
import sequelizeConfig from "../config/sequelize.config";
import { appConfig } from "../config/app.config";


export class MigrationInitializer {

    private sequelize: Sequelize;


    constructor() {
        this.sequelize = new Sequelize(sequelizeConfig);
    }

    private async confirmMigration(): Promise<boolean> {
        const tableNames = await this.sequelize.getQueryInterface().showAllTables();
        if (tableNames.length > 0) {                        
            if (!readlineSync.keyInYNStrict('This will drop and migrate again. Are you sure you want to proceed?')) {
                return false;
            }
        }
        return true;
    }

    private async dropAndRecreateTables() {
        await this.sequelize.sync();
        // await this.sequelize.sync({ force: true }); //-- FORCE MIGRATE DROP AND CREATE
    }

    private async handleMigrationError(error: any) {
        console.log('\x1b[31m%s\x1b[0m', error.message, error);
        process.exit(0);
    }

    public async startMigration(allow_confirm = true) {
        try {
            if( ['local', 'dev', 'uat'].includes(appConfig.ENV.toLocaleLowerCase())) {

                // :: CONFIRM
                if(allow_confirm) {
                    const confirmation = await this.confirmMigration();
                    if (!confirmation) {
                        console.log('\nMigration aborted.'.cyan);
                        process.exit(0);
                    }
                }
    
                // :: DROP AND CREATE ::
                await this.dropAndRecreateTables();
                console.log('\nMigration completed successfully.'.green);
            } else {
                console.log(`\nMigration have been suspend for your current ENV: ${appConfig.ENV}.`.green);
            }
            process.exit(0);
        } catch (error) {
            await this.handleMigrationError(error);
        }
    }
}

const migrationInitializer = new MigrationInitializer();
migrationInitializer.startMigration();
