import { Injectable }           from '@angular/core';
import { AuthGuard }            from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard }          from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent }      from 'app/layout/layout.component';
import { RoleEnum }             from '../helper/enums/role.enum';
import { initialDataResolver }  from './app.resolver';
import { roleResolver }         from './core/auth/resolvers/role.resolver';
import { CanActivate, Route, Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class RedirectGuard implements CanActivate {
    constructor(private router: Router) { }

    canActivate(): boolean {

        this.router.navigate(['/admin/dashboard']);

        return false;
    }
}

export const appRoutes: Route[] = [
    // Redirect empty path to 'redirect'
    { path: '', pathMatch: 'full', redirectTo: 'redirect' },

    // Dummy route to handle redirection based on role
    {
        path: 'redirect',
        canActivate: [RedirectGuard],
        component: LayoutComponent
    },

    // Auth routes for guests
    {
        path: 'auth',
        canActivate: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        loadChildren: () => import('app/resources/r1-account/auth/auth.routes')
    },

    // Admin routes
    {
        path: '',
        canActivate: [AuthGuard],
        component: LayoutComponent,
        resolve: {
            initialData: initialDataResolver
            // initialData: devInitialDataResolver
        },
        children: [
            // Role admin
            {
                path: 'admin',
                resolve: {
                    role: roleResolver([RoleEnum.ADMIN])
                    // role: devRoleResolver([RoleEnum.ADMIN])
                },
                loadChildren: () => import('app/resources/r2-admin/route')
            },
            // Role user
            {
                path: 'user',
                resolve: {
                    role: roleResolver([RoleEnum.USER])
                    // role: devRoleResolver([RoleEnum.USER])
                },
                loadChildren: () => import('app/resources/r3-user/route')
            },
            // 404
            {
                path: '404-not-found',
                pathMatch: 'full',
                loadChildren: () => import('app/shared/error/not-found.routes')
            },
            // Catch all
            {
                path: '**',
                redirectTo: '404-not-found'
            }
        ]
    }
];
