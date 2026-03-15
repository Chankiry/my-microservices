import { Routes } from "@nestjs/core";
import { AuthModule } from "./a1-auth/module";
import { ProfileModule } from "./a2-profile/module";

export const accountRoutes: Routes = [
    {
        path: 'auth',
        module: AuthModule
    },
    {
        path: 'profile',
        module: ProfileModule
    }
];
