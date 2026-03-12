import { Routes } from "@nestjs/core";
import { appConfig } from "src/config/app.config";
import { UserRoutes } from "./resources/user/user.route";
import { OrgAdminRoutes } from "./resources/org_admin/org_admin.route";
import { SuperAdminRoutes } from "./resources/super_admin/super_admin.route";
import { AccountRoutes } from "./resources/account/account.route";
import { SharedDataModule } from "./resources/shared/shared.module";
import { PublicModule } from "./resources/public/public.module";

export const appRoutes: Routes = [
    {
        path: appConfig.API_PREFIX,
        children: [
            {
                path: 'account',
                children: AccountRoutes
            },
            {
                path: 'user',
                children: UserRoutes
            },
            {
                path: 'org/:org_id',
                children: OrgAdminRoutes
            },
            {
                path: 'sup',
                children: SuperAdminRoutes
            },
            {
                path: 'shared',
                module: SharedDataModule
            },
            {
                path: 'public',
                module: PublicModule
            },
        ]
    }
];