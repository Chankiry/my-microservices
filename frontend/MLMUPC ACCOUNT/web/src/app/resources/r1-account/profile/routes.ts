import { Routes }           from '@angular/router';
import { ProfileComponent } from './component';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'profile' },
    {
        path     : 'my-profile',
        component: ProfileComponent,
    },
] as Routes;
