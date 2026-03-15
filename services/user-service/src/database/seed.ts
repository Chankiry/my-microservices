// ================================================================>> Third Party Library
import "colors";
import * as readlineSync from 'readline-sync';
import { Sequelize } from 'sequelize-typescript';

// ================================================================>> Custom Library
import { SchemaEnum } from "../app/shared/enums/schema.enum";
import sequelizeConfig from "../config/sequelize.config";
import { appConfig } from "../config/app.config";

class SeederInitializer {
    // private readonly logger = new LoggerService(SeederInitializer.name);
    private sequelize: Sequelize;
    private schemas: string[] = Object.values(SchemaEnum);

    constructor() {
        this.sequelize = new Sequelize(sequelizeConfig);
    }

    public async createSchemas() {
        const queryInterface = this.sequelize.getQueryInterface();
        const existingSchemas = Object.keys(await queryInterface.showAllSchemas());
        for (const schema of this.schemas) {
            if (!existingSchemas.includes(schema)) {
                await queryInterface.createSchema(schema);
                console.log(`- Schema '${schema}' created.`.green);
            }
        }
    }

    private async confirmSeeding(): Promise<boolean> {
        const tableNames = await this.sequelize.getQueryInterface().showAllTables();
        if (tableNames.length > 0) {
            const projectName = 'HRM_API';
            
            if (!readlineSync.keyInYNStrict('This will drop and seed again. Are you sure you want to proceed?')) {
                return false;
            }
    
            // CONFIRM IN PROD ENV
            if(['uat', 'prod'].includes(appConfig.ENV.toLocaleLowerCase())) {
                if (!readlineSync.keyInYNStrict('Have you backed up the database?')) {
                    return false;
                }
    
                if (!readlineSync.keyInYNStrict('Are you sure you backed up the database?')) {
                    return false;
                }
    
                const inputProjectName = readlineSync.question(`Please type project name before processing this hard seeding (${projectName}): `);
                if (inputProjectName.trim() !== projectName) {
                    console.log('Incorrect project name! Seeding aborted.');
                    return false;
                }
            }
    
            return true;
        }

        return true;
    }

    private async seedData() {
        

    }

    private async handleSeedingError(error: any) {
        await this.sequelize.sync({ force: true });
        console.log('\x1b[31m%s\x1b[0m', error.message);
        process.exit(0);
    }

    private async resetSequences() {
        await this.sequelize.query(`
            SELECT setval('data.department_id_seq', (SELECT MAX(id) FROM data.department));
            SELECT setval('user.user_id_seq', (SELECT MAX(id) FROM "user"."user"));
            SELECT setval('public.file_id_seq', (SELECT MAX(id) FROM "public"."file"));
        `);
    }

    public async startSeeding() {
        try {
            if( ['local', 'dev'].includes(appConfig.ENV.toLocaleLowerCase())) {
                const confirmation = await this.confirmSeeding();
                if (!confirmation) {
                    console.log('\nSeeders have been cancelled.'.cyan);
                    process.exit(0);
                }

                // :: DROP AND CREATE ::
                await this.createSchemas();
                await this.sequelize.drop({ cascade: true });
                await this.sequelize.sync({ force: true });
                await this.seedData();
                await this.resetSequences();
                console.log('\nSeed completed.'.green);

            } else {
                console.log(`\nSeed have been suspend for your current ENV: ${appConfig.ENV}.`.green);
            }
            process.exit(0);

        } catch (error) {
            await this.handleSeedingError(error);
        }
    }
}

const seederInitializer = new SeederInitializer();
seederInitializer.startSeeding();
