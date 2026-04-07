// ================================================================================>> Main Library
import { Routes }                                              from "@angular/router";

// ================================================================================>> Custom Library
// ===>> Member
import { AdminHomeComponent }                                  from "./a1-home/component";
import { AdminAccountComponent }                                   from "./a2-account/component";
import { AdminSystemComponent }                                     from "./a3-system/component";
import { AdminNewKnowledgeComponent }                                  from "./a4-new-knowledge/component";
import { AdminSecurityComponent }                                  from "./a5-security/component";
import { AdminSettingComponent }                                   from "./a6-setting/component";

export default [
    {
        path: 'home',
        component: AdminHomeComponent,
    },
    {
        path: 'accounts',
        component: AdminAccountComponent,
    },
    {
        path: 'systems',
        component: AdminSystemComponent,
    },
    {
        path: 'new-knowledge',
        component: AdminNewKnowledgeComponent,
    },
    {
        path: 'security',
        component: AdminSecurityComponent,
    },
    {
        path: 'settings',
        component: AdminSettingComponent,
    },
] as Routes;
