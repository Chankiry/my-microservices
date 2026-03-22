// ================================================================================>> Main Library
import { Routes }                                              from "@angular/router";

// ================================================================================>> Custom Library
// ===>> Member
import { DashboardComponent }                                  from "./a1-dashboard/component";


export default [
    {
        path: 'dashboard',
        component: DashboardComponent,
    },
] as Routes;
