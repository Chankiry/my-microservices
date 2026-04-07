// ================================================================================>> Main Library
import { Routes }                                              from "@angular/router";

// ================================================================================>> Custom Library
// ===>> Member
import { UserHomeComponent }                                  from "./u1-home/component";


export default [
    {
        path: 'home',
        component: UserHomeComponent,
    },
] as Routes;
