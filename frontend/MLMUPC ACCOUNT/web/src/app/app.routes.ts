import { Injectable }       from '@angular/core';
import { CanActivate, Route, Router } from '@angular/router';
import { AuthGuard }        from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard }      from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent }  from 'app/layout/layout.component';
import { initialDataResolver } from './app.resolver';
import { roleResolver }     from './core/auth/resolvers/role.resolver';

@Injectable({ providedIn: 'root' })
export class RedirectGuard implements CanActivate {
    constructor(private router: Router) {}
    canActivate(): boolean {
        this.router.navigate(['/admin/dashboard']);
        return false;
    }
}

export const appRoutes: Route[] = [

    { path: '', pathMatch: 'full', redirectTo: 'redirect' },

    {
        path      : 'redirect',
        canActivate: [RedirectGuard],
        component : LayoutComponent,
    },

    // ─── Guest routes ──────────────────────────────────────────────────────────
    {
        path      : 'auth',
        canActivate: [NoAuthGuard],
        component : LayoutComponent,
        data      : { layout: 'empty' },
        loadChildren: () => import('app/resources/r1-account/auth/auth.routes'),
    },

    // ─── Authenticated routes ──────────────────────────────────────────────────
    {
        path      : '',
        canActivate: [AuthGuard],
        component : LayoutComponent,
        resolve   : { initialData: initialDataResolver },
        children  : [
            {
                path        : 'profile',
                loadChildren: () => import('app/resources/r1-account/profile/routes'),
            },
            {
                path   : 'admin',
                resolve: { role: roleResolver(['admin']) },
                loadChildren: () => import('app/resources/r2-admin/route'),
            },
            {
                path   : 'user',
                resolve: { role: roleResolver(['user']) },
                loadChildren: () => import('app/resources/r3-user/route'),
            },
            {
                path     : '404-not-found',
                pathMatch: 'full',
                loadChildren: () => import('app/shared/error/not-found.routes'),
            },
            { path: '**', redirectTo: '404-not-found' },
        ],
    },
];
