// ================================================================>> Third Party Library
import "colors";
import * as readlineSync from 'readline-sync';
import { Sequelize } from 'sequelize-typescript';

// ================================================================>> Custom Library
import sequelizeConfig from '@config/sequelize.config';
import { appConfig } from "@config/app.config";
import { SetupSeeder } from "./seed/setup/setup.seed";
import { UserSeeder } from "./seed/user/user.seed";

class SeederInitializer {

    private sequelize: Sequelize;

    constructor() {
        this.sequelize = new Sequelize(sequelizeConfig);
    }

    private async confirmSeeding(): Promise<boolean> {
        const tableNames = await this.sequelize.getQueryInterface().showAllTables();
        if (tableNames.length > 0) {
            const message = 'This will drop and seed again. Are you sure you want to proceed?'.yellow;
            return readlineSync.keyInYNStrict(message);
        }
        return true;
    }

    private async dropAndSyncDatabase() {
        await this.sequelize.sync({ force: true });
    }

    private async seedData() {
        //===================== setup data
        await SetupSeeder.seed();
        //===================== user data
        await UserSeeder.seed();

        // After all seeding is done, update creator_id
        // await this.updateCreatorId();
    }

    private async updateCreatorId() {
        const tablesToUpdate = [
            'user',
        ];

        for (const tableName of tablesToUpdate) {
            await this.sequelize.getQueryInterface().bulkUpdate(tableName, {
                creator_id: 1,
                updater_id: 1
            }, {
                creator_id: null // or whatever condition suits your needs
            });
        }
    }

    private async handleSeedingError(error: Error) {
        await this.sequelize.sync({ force: true });
        console.log('\x1b[31m%s\x1b[0m', error.message);
        process.exit(0);
    }

    public async startSeeding() {
        try {
            if(appConfig.ENV === 'LOCAL' || appConfig.ENV === 'DEV' || appConfig.ENV === 'UAT') {
                const confirmation = await this.confirmSeeding();
                if (!confirmation) {
                    console.log('\nSeeders have been cancelled.'.cyan);
                    process.exit(0);
                }
    
                await this.dropAndSyncDatabase();
                await this.seedData();
                console.log('\nSeeding completed successfully.'.green);
            
            } else {
                console.log("\nSeeding isn't allowed in your environment: [" + appConfig.ENV + "].".red);

            }
            process.exit(0);
        } catch (error) {
            await this.handleSeedingError(error);
        }
    }
}

const seederInitializer = new SeederInitializer();
seederInitializer.startSeeding();
