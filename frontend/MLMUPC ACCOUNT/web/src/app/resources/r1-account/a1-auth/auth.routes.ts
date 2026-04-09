import { Routes }           from '@angular/router';
import { AuthSignInComponent } from './sign-in/component';
import { AuthSignUpComponent } from './sign-up/component';
import { AuthLayoutComponent } from './component';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
    {
        path     : '',
        component: AuthLayoutComponent,
        children : [
            {
                path     : 'sign-in',
                component: AuthSignInComponent,
            },
            {
                path     : 'sign-up',
                component: AuthSignUpComponent,
            },
        ],
    },
] as Routes;
