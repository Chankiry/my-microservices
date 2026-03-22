// ================================================================================>> Main Library
import { Routes }                                              from "@angular/router";

// ================================================================================>> Custom Library
// ===>> Member
import { UserDashboardComponent }                                  from "./u1-dashboard/component";


export default [
    {
        path: 'dashboard',
        component: UserDashboardComponent,
    },
] as Routes;
