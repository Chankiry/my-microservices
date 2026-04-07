import { inject }             from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { of }                 from 'rxjs';
import { AuthService }        from 'app/core/auth/auth.service';
import { UserService }        from 'app/core/user/user.service';
import { jwtDecode }          from 'jwt-decode';

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

    // If redirect params present — always let through even if logged in.
    // sign-in ngOnInit will detect the params and immediately process the flow.
    const hasRedirectParams =
        route.queryParams['redirect_uri'] &&
        route.queryParams['system_id']    &&
        route.queryParams['action'];

    if (hasRedirectParams) {
        return of(true);
    }

    // Normal case — if already logged in with valid token, go to home
    if (token) {
        try {
            const payload: any = jwtDecode(token);
            if (payload?.exp && payload.exp > Date.now() / 1000) {
                return of(router.parseUrl(''));
            }
        } catch { /* expired/invalid — let them through to sign in again */ }
    }

    return of(true);
};
