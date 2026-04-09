// ================================================================================>> Main Library
import { Routes }                                              from "@angular/router";

// ================================================================================>> Custom Library
// ===>> Member
import { UserHomeComponent }                                  from "./u1-home/component";
import { LinkConfirmComponent } from "./u2-link-confirm/component";


export default [
    {
        path: 'home',
        component: UserHomeComponent,
    },
    {
        path     : 'link-confirm',
        component: LinkConfirmComponent,
    },
] as Routes;
