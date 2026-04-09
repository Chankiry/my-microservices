import { Routes } from '@angular/router';
import { ProfileComponent } from './my-profile/component';
import { ProfileLayoutComponent } from './component';
import { ProfileLogComponent } from './log/component';

export default [
    {
        path: '',
        component: ProfileLayoutComponent,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'my-profile' },
            {
                path: 'my-profile',
                component: ProfileComponent
            },
            // {
            //     path: 'security',
            //     component: ProfileSecurityComponent
            // },
            {
                path: 'log',
                component: ProfileLogComponent
            },
        ]

    },
] as Routes;
