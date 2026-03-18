import { Routes } from "@nestjs/core";
import { accountRoutes } from "./resources/r1-account/account.routes";
import { UserModule } from "./resources/r2-user/module";
import { PublicModule } from "./resources/r3-public/module";
import { appConfig } from "../config/app.config";
import { AppsModule } from "./resources/r4-apps/module";
import { ManagementModule } from "./resources/r5-management/module";

export const appRoutes: Routes = [
    {
        path: appConfig.API_PREFIX,
        children: [
            {
                path: 'account',
                children: accountRoutes
            },
            {
                path: 'users',
                module: UserModule
            },
            {
                path: 'public',
                module: PublicModule
            },
            {
                path: 'apps',
                module: AppsModule
            },
            {
                path: 'management',
                module: ManagementModule
            },
        ]
    }
];
