import { Injectable }       from '@angular/core';
import { CanActivate, Route, Router } from '@angular/router';
import { AuthGuard }        from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard }      from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent }  from 'app/layout/layout.component';
import { initialDataResolver } from './app.resolver';
import { roleResolver }     from './core/auth/resolvers/role.resolver';
import { ServiceDownComponent } from './shared/service-down.component';

@Injectable({ providedIn: 'root' })
export class RedirectGuard implements CanActivate {
    constructor(private router: Router) {}
    canActivate(): boolean {
        this.router.navigate(['/admin/home']);
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

    // ─── Service down — NO guard, NO resolver ─────────────────────────────────
    // This route must never trigger the resolver to avoid the infinite loop:
    //   resolver fails → /auth → NoAuthGuard bounces back → resolver fails → ...
    {
        path     : 'service-down',
        component: ServiceDownComponent,
    },

    // ─── Profile (authenticated, no navigation) ────────────────────────────────
    {
        path        : 'profile',
        canActivate : [AuthGuard],
        component   : LayoutComponent,
        data        : { layout: 'header' },
        resolve     : { initialData: initialDataResolver },
        loadChildren: () => import('app/resources/r1-account/profile/routes'),
    },

    // ─── User (authenticated, no navigation) ────────────────────────────────
    {
        path        : 'user',
        canActivate : [AuthGuard],
        component   : LayoutComponent,
        data        : { layout: 'header' },
        resolve     : { initialData: initialDataResolver },
        loadChildren: () => import('app/resources/r3-user/route'),
    },

    // ─── Authenticated routes ──────────────────────────────────────────────────
    {
        path      : '',
        canActivate: [AuthGuard],
        component : LayoutComponent,
        resolve   : { initialData: initialDataResolver },
        children  : [
            {
                path   : 'admin',
                resolve: { role: roleResolver(['admin']) },
                loadChildren: () => import('app/resources/r2-admin/route'),
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
