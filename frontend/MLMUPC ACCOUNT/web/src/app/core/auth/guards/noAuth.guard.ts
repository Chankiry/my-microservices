import { inject }  from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { of }      from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { jwtDecode }   from 'jwt-decode';

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const router      = inject(Router);
    const authService = inject(AuthService);
    const token       = authService?.accessToken;

    // Always allow callback route
    if (state.url.startsWith('/auth/callback')) {
        return of(true);
    }

    // If redirect params present — allow through even if already logged in.
    // The sign-in component will detect the params and complete the flow.
    const hasRedirectParams =
        route.queryParams['redirect_uri'] &&
        route.queryParams['system_id']    &&
        route.queryParams['action'];

    if (hasRedirectParams) {
        return of(true);
    }

    // Normal case — if already logged in, go to dashboard
    if (token) {
        try {
            const payload: any = jwtDecode(token);
            if (payload?.exp && payload.exp > Date.now() / 1000) {
                return of(router.parseUrl(''));
            }
        } catch { /* expired/invalid — let them through */ }
    }

    return of(true);
};
