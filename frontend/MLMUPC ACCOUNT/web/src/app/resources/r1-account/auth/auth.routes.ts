// ================================================================================>> Main Library
import { Routes } from '@angular/router';

// ================================================================================>> Custom Library
// Component
import { AuthSignInComponent } from './sign-in/component';
import { AuthSignUpComponent } from './sign-up/sign-up.component';
import { VerifyEmailComponent } from './verify-email/verify-email.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { OverviewLoginComponent } from './overviewlogin/component';
import { AuthLayoutComponent } from './component';
import { VerifyCodeWithEmailComponent } from '../login-code/verify-code-email/verify-email.component';
import { PasswordComponent } from '../login-code/create-password/password.component';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'sign-in' },
    // Callback must be outside AuthLayoutComponent
    // so it loads immediately without the layout wrapper
    {
        path        : 'callback',
        loadComponent: () =>
            import('./callback/component').then(m => m.AuthCallbackComponent),
    },
    {
        path: '',
        component: AuthLayoutComponent,
        children: [
            // {
            //     path: '',
            //     component: OverviewLoginComponent
            // },
            {
                path: 'sign-in',
                component: AuthSignInComponent
            },
            // {
            //     path: 'sign-up',
            //     component: AuthSignUpComponent,
            // },
            // {
            //     path: 'verify-email',
            //     component: VerifyEmailComponent,
            // },
            // {
            //     path: 'verify-code-email',
            //     component: VerifyCodeWithEmailComponent,
            // },
            // {
            //     path: 'verify-code-email/password',
            //     component: PasswordComponent,
            // },
            // {
            //     path: 'reset-password',
            //     component: ResetPasswordComponent,
            // }
        ]
    }
] as Routes;
